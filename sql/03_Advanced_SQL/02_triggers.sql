PRAGMA foreign_keys = ON;

DROP TRIGGER IF EXISTS trg_prescription_before_insert_check_stock;
DROP TRIGGER IF EXISTS trg_prescription_after_insert_apply_stock;
DROP TRIGGER IF EXISTS trg_prescription_before_update_check_stock;
DROP TRIGGER IF EXISTS trg_prescription_after_update_apply_stock;
DROP TRIGGER IF EXISTS trg_prescription_after_delete_apply_stock;

CREATE TRIGGER trg_prescription_before_insert_check_stock
BEFORE INSERT ON fact_prescription_detail
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN (SELECT current_stock FROM dim_medication WHERE medication_key = NEW.medication_key) < NEW.quantity
        THEN RAISE(ABORT, 'Insufficient medication stock for prescription transaction.')
    END;
END;

CREATE TRIGGER trg_prescription_after_insert_apply_stock
AFTER INSERT ON fact_prescription_detail
FOR EACH ROW
BEGIN
    UPDATE dim_medication
    SET current_stock = current_stock - NEW.quantity
    WHERE medication_key = NEW.medication_key;

    INSERT INTO ops_stock_alert (
        medication_key,
        stock_after_txn,
        critical_stock_level,
        alert_message
    )
    SELECT
        m.medication_key,
        m.current_stock,
        m.critical_stock_level,
        'Critical stock reached for ' || m.medication_code || '. Current stock: ' || m.current_stock
    FROM dim_medication AS m
    WHERE m.medication_key = NEW.medication_key
      AND m.current_stock <= m.critical_stock_level;
END;

CREATE TRIGGER trg_prescription_before_update_check_stock
BEFORE UPDATE ON fact_prescription_detail
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.medication_key = OLD.medication_key
             AND (SELECT current_stock FROM dim_medication WHERE medication_key = NEW.medication_key) + OLD.quantity < NEW.quantity
        THEN RAISE(ABORT, 'Insufficient medication stock for prescription update transaction.')
    END;

    SELECT CASE
        WHEN NEW.medication_key <> OLD.medication_key
             AND (SELECT current_stock FROM dim_medication WHERE medication_key = NEW.medication_key) < NEW.quantity
        THEN RAISE(ABORT, 'Insufficient medication stock for prescription update transaction.')
    END;
END;

CREATE TRIGGER trg_prescription_after_update_apply_stock
AFTER UPDATE ON fact_prescription_detail
FOR EACH ROW
BEGIN
    UPDATE dim_medication
    SET current_stock = current_stock + OLD.quantity
    WHERE medication_key = OLD.medication_key;

    UPDATE dim_medication
    SET current_stock = current_stock - NEW.quantity
    WHERE medication_key = NEW.medication_key;

    INSERT INTO ops_stock_alert (
        medication_key,
        stock_after_txn,
        critical_stock_level,
        alert_message
    )
    SELECT
        m.medication_key,
        m.current_stock,
        m.critical_stock_level,
        'Critical stock reached for ' || m.medication_code || '. Current stock: ' || m.current_stock
    FROM dim_medication AS m
    WHERE m.medication_key IN (OLD.medication_key, NEW.medication_key)
      AND m.current_stock <= m.critical_stock_level;
END;

CREATE TRIGGER trg_prescription_after_delete_apply_stock
AFTER DELETE ON fact_prescription_detail
FOR EACH ROW
BEGIN
    UPDATE dim_medication
    SET current_stock = current_stock + OLD.quantity
    WHERE medication_key = OLD.medication_key;
END;

DROP TRIGGER IF EXISTS trg_medication_resolve_alerts;

CREATE TRIGGER trg_medication_resolve_alerts
AFTER UPDATE OF current_stock ON dim_medication
FOR EACH ROW
WHEN NEW.current_stock > NEW.critical_stock_level
BEGIN
    UPDATE ops_stock_alert
    SET
        is_resolved = 1,
        resolved_at = CURRENT_TIMESTAMP,
        resolved_note = 'Auto-resolved after stock refill.'
    WHERE medication_key = NEW.medication_key
      AND is_resolved = 0;
END;
