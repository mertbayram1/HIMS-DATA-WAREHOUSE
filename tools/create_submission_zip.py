import os
import zipfile

def create_zip(zip_path, source_dir):
    exclude_dirs = {'.venv_app', 'node_modules', '.git', '.pytest_cache', '__pycache__'}
    exclude_files = {'README.md', 'app.log', '.env', os.path.basename(zip_path)}
    
    count = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Modify dirs in-place to avoid walking into excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file in exclude_files:
                    continue
                if file.endswith('.pyc') or file.endswith('.pyo') or file.endswith('.db-journal'):
                    continue
                
                full_path = os.path.join(root, file)
                arcname = os.path.relpath(full_path, source_dir)
                
                # Also double check inside relative path for exclusions
                parts = arcname.split(os.sep)
                if any(p in exclude_dirs for p in parts):
                    continue
                
                zipf.write(full_path, arcname)
                count += 1
    print(f"Added {count} files to the zip archive.")

if __name__ == '__main__':
    # Determine the script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    source_dir = os.path.dirname(script_dir) # HIMS_Project root
    zip_name = 'HIMS_Project.zip'
    zip_path = os.path.join(source_dir, zip_name)
    
    print(f"Starting compression...")
    print(f"Source directory: {source_dir}")
    print(f"Zip output path: {zip_path}")
    
    create_zip(zip_path, source_dir)
    print("Compression complete!")
