# HIT Lunch - GCP Deployment Script (PowerShell)
# Make sure you are authenticated with: gcloud auth login

$ProjectID = gcloud config get-value project

Write-Host "🤖 HIT Lunch GCP Deployer" -ForegroundColor Cyan
Write-Host "------------------------" -ForegroundColor Cyan
Write-Host "Detected Project ID: $ProjectID" -ForegroundColor Yellow

if ([string]::IsNullOrEmpty($ProjectID)) {
    Write-Host "❌ Error: No active gcloud project selected. Run 'gcloud config set project YOUR_PROJECT_ID' first." -ForegroundColor Red
    Exit
}

$Confirm = Read-Host "Deploy to Cloud Run in project '$ProjectID'? (y/N)"
if ($Confirm -ne "y" -and $Confirm -ne "Y") {
    Write-Host "❌ Deployment cancelled." -ForegroundColor Red
    Exit
}

Write-Host "`n🚀 Step 1: Enabling required APIs (Cloud Run, Cloud Build, Firestore)..." -ForegroundColor Blue
gcloud services enable run.googleapis.com firestore.googleapis.com --quiet

Write-Host "`n🚀 Step 2: Building container in the cloud using Cloud Build..." -ForegroundColor Blue
gcloud builds submit --tag "gcr.io/$ProjectID/hit-lunch"

Write-Host "`n🚀 Step 3: Deploying container to Google Cloud Run..." -ForegroundColor Blue
gcloud run deploy hit-lunch `
  --image "gcr.io/$ProjectID/hit-lunch" `
  --platform managed `
  --allow-unauthenticated `
  --region us-central1 `
  --set-env-vars DATABASE_TYPE=firestore `
  --quiet

Write-Host "`n🎉 Deployment finished! Check the URL above to access the app." -ForegroundColor Green
