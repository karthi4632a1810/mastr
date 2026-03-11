# Build APK Script for Capacitor Android App
# This script builds the APK using command line tools

Write-Host "=== Building APK for vaaltic HRMS ===" -ForegroundColor Green

# Step 1: Accept Android SDK Licenses
Write-Host "`n[1/4] Accepting Android SDK licenses..." -ForegroundColor Yellow
$licenseDir = "C:\licenses"
if (-not (Test-Path $licenseDir)) {
    New-Item -ItemType Directory -Path $licenseDir -Force | Out-Null
}

# Common Android SDK license hashes
$licenseHashes = @(
    "24333f8a63b6825ea9c5514f83c2829b004d1fee",
    "d975f987698a77ab43dd6ea8d68de0d96d10287d",
    "8933bad161af4178b1185d1a37fbf41ea5269c65",
    "844e3be0d2a41b7bbff25625957f517423acb80e",
    "601085b94cd77f0b54ff86406957099ebe79c4d6",
    "33b6a33b8950d4e89e6b38a476097609e4b1b0a0"
)

foreach ($hash in $licenseHashes) {
    $licenseFile = Join-Path $licenseDir $hash
    if (-not (Test-Path $licenseFile)) {
        # License file should contain the hash itself
        $hash | Out-File -FilePath $licenseFile -Encoding ASCII -NoNewline
    }
}
Write-Host "License files created." -ForegroundColor Green

# Step 2: Try to find Android SDK and accept licenses via sdkmanager
Write-Host "`n[2/4] Looking for Android SDK..." -ForegroundColor Yellow
$sdkPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "C:\Android\Sdk",
    "$env:ProgramFiles\Android\Android Studio\sdk"
)

$sdkFound = $false
foreach ($sdkPath in $sdkPaths) {
    if (Test-Path $sdkPath) {
        Write-Host "Found Android SDK at: $sdkPath" -ForegroundColor Green
        $sdkmanager = Get-ChildItem -Path $sdkPath -Recurse -Filter "sdkmanager.bat" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($sdkmanager) {
            Write-Host "Found sdkmanager, accepting licenses..." -ForegroundColor Green
            # Accept all licenses by piping 'y' responses
            $yes = "y`n" * 10
            $yes | & $sdkmanager.FullName --licenses 2>&1 | Out-Null
            $sdkFound = $true
            break
        }
    }
}

if (-not $sdkFound) {
    Write-Host "Android SDK not found in common locations." -ForegroundColor Yellow
    Write-Host "Make sure Android SDK is installed or set ANDROID_HOME environment variable." -ForegroundColor Yellow
}

# Step 3: Sync Capacitor
Write-Host "`n[3/4] Syncing Capacitor..." -ForegroundColor Yellow
$frontendDir = Split-Path -Parent $PSScriptRoot
Set-Location $frontendDir
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "Capacitor sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Capacitor sync completed." -ForegroundColor Green

# Step 4: Build APK using Gradle
Write-Host "`n[4/4] Building APK with Gradle..." -ForegroundColor Yellow
$androidDir = Join-Path $frontendDir "android"
Set-Location $androidDir

# Build debug APK
Write-Host "Building debug APK..." -ForegroundColor Cyan
.\gradlew.bat assembleDebug --no-daemon

if ($LASTEXITCODE -eq 0) {
    $apkPath = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $apkPath) {
        Write-Host "`n=== SUCCESS! ===" -ForegroundColor Green
        Write-Host "APK built successfully!" -ForegroundColor Green
        Write-Host "Location: $apkPath" -ForegroundColor Cyan
        Write-Host "`nYou can now install this APK on your Android device." -ForegroundColor Yellow
    } else {
        Write-Host "`nBuild completed but APK not found at expected location." -ForegroundColor Yellow
    }
} else {
    Write-Host "`n=== BUILD FAILED ===" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Red
    exit 1
}






