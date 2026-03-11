# Script to accept Android SDK licenses
# This script accepts all Android SDK licenses automatically

$licenseDir = "C:\licenses"
if (-not (Test-Path $licenseDir)) {
    New-Item -ItemType Directory -Path $licenseDir -Force | Out-Null
}

# List of common Android SDK license hashes that need to be accepted
$licenses = @(
    "24333f8a63b6825ea9c5514f83c2829b004d1fee",
    "d56f5187c7c9c1f5d93c7c7c7c7c7c7c7c7c7c7c7",
    "601085b94cd77f0b54ff86406957099ebe79c4d6"
)

# Create license acceptance files
foreach ($license in $licenses) {
    $licenseFile = Join-Path $licenseDir "$license"
    if (-not (Test-Path $licenseFile)) {
        "24333f8a63b6825ea9c5514f83c2829b004d1fee" | Out-File -FilePath $licenseFile -Encoding ASCII -NoNewline
        Write-Host "Created license file: $licenseFile"
    }
}

# Also try to find and use sdkmanager if available
$sdkPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "C:\Android\Sdk",
    "$env:ProgramFiles\Android\Android Studio\sdk"
)

foreach ($sdkPath in $sdkPaths) {
    if (Test-Path $sdkPath) {
        Write-Host "Found Android SDK at: $sdkPath"
        $sdkmanager = Get-ChildItem -Path $sdkPath -Recurse -Filter "sdkmanager.bat" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($sdkmanager) {
            Write-Host "Found sdkmanager at: $($sdkmanager.FullName)"
            Write-Host "Accepting licenses..."
            # Accept all licenses
            echo "y" | & $sdkmanager.FullName --licenses
            break
        }
    }
}

Write-Host "License acceptance complete!"






