$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Users\martha rajesh\OneDrive\Desktop\farmland-marketplace"
$Python = "$ProjectRoot\backend\venv\Scripts\python.exe"
$Script = "$ProjectRoot\backend\scripts\backup_database.py"
$LogFile = "$ProjectRoot\backups\scheduler_backup.log"

try {
    Set-Location $ProjectRoot

    Add-Content $LogFile ""
    Add-Content $LogFile "============================================================"
    Add-Content $LogFile "Backup started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Add-Content $LogFile "Python: $Python"
    Add-Content $LogFile "Script: $Script"

    & $Python $Script *>> $LogFile

    $ExitCode = $LASTEXITCODE

    Add-Content $LogFile "Backup process exit code: $ExitCode"
    Add-Content $LogFile "Backup finished: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

    if ($ExitCode -ne 0) {
        exit $ExitCode
    }
}
catch {
    Add-Content $LogFile "ERROR: $($_.Exception.Message)"
    Add-Content $LogFile "Backup failed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    exit 1
}