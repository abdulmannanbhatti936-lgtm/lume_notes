# 🚀 Deployment Guide - Lume Notes to Vercel + Neon

Complete guide to deploy your Lume Notes project on **Vercel** with a free PostgreSQL database on **Neon**.

---

## Step 1: Set Up Neon Database (Free PostgreSQL)

### 1.1 Create Neon Account
1. Go to https://neon.tech
2. Click "Sign Up" → Sign up with GitHub (recommended)
3. Authorize the connection

### 1.2 Create a Project
1. After login, click "Create Project"
2. **Project Name**: `lume-notes`
3. **Database Name**: `lume_notes`
4. **Region**: Select closest to you
5. Click "Create Project"

### 1.3 Get Connection String
1. You'll see your connection details
2. Copy the **Connection string** (looks like: `postgresql://user:password@host/database`)
3. **Save this securely** - you'll need it for Vercel

---

## Step 2: Set Up Google OAuth

### 2.1 Create Google OAuth Credentials
1. Go to https://console.cloud.google.com
2. Create a new project: `lume-notes`
3. Enable **Google+ API**
4. Go to **Credentials** → Create OAuth 2.0 Client
5. Application type: **Web application**
6. **Authorized redirect URIs**: 
   - Add: `http://localhost:3000/api/auth/callback/google` (for testing)
   - Add: `https://yourdomain.vercel.app/api/auth/callback/google` (replace with your domain)
7. Copy **Client ID** and **Client Secret**

---

## Step 3: Set Up GitHub OAuth (Optional but Recommended)

### 3.1 GitHub OAuth App
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. **Application name**: `Lume Notes`
4. **Homepage URL**: `https://yourdomain.vercel.app`
5. **Authorization callback URL**: `https://yourdomain.vercel.app/api/auth/callback/github`
6. Copy **Client ID** and **Client Secret**

---

## Step 4: Deploy to Vercel

### 4.1 Connect GitHub to Vercel
1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "Import Project"
4. Select your repository: `abdulmannanbhatti936-lgtm/lume_notes`
5. Select "Next.js" framework (auto-detected)

### 4.2 Configure Build Settings
- **Framework Preset**: Next.js ✓
- **Build Command**: `pnpm build` (auto-detected)
- **Install Command**: `pnpm install` (auto-detected)
- **Output Directory**: `.next` (auto-detected)

### 4.3 Add Environment Variables
In Vercel dashboard, add these variables:

```
DATABASE_URL = postgresql://user:password@host/database
NEXTAUTH_URL = https://yourdomain.vercel.app
AUTH_SECRET = (generate with: openssl rand -base64 32)

GITHUB_CLIENT_ID = your-github-id
GITHUB_CLIENT_SECRET = your-github-secret

GOOGLE_CLIENT_ID = your-google-id
GOOGLE_CLIENT_SECRET = your-google-secret

GOOGLE_GENERATIVE_AI_API_KEY = your-api-key
MISTRAL_API_KEY = blBpx9sRhwvmi66PQz6sMcOkBQzBCf6D

BREVO_API_KEY = your-brevo-key
BREVO_FROM_EMAIL = your-email@domain.com
BREVO_FROM_NAME = Abdul Mannan Bhatti

NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY = your-liveblocks-key
```

### 4.4 Deploy
1. Click "Deploy"
2. Wait for build to complete (5-10 minutes first time)
3. Your site will be live at: `https://your-project.vercel.app`

---

## Step 5: Initialize Database

### 5.1 Run Migrations on Vercel
After deployment, run in Vercel CLI or use build logs:

```bash
npx prisma migrate deploy
npx prisma db seed
```

Or use Prisma Studio:
```bash
npx prisma studio
```

---

## Step 6: Set Up Custom Domain (Optional)

1. In Vercel → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration steps
4. Update `NEXTAUTH_URL` and OAuth redirect URIs

---

## 🔑 Environment Variables Quick Reference

| Variable | Where to Get | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon dashboard | ✅ Yes |
| `NEXTAUTH_URL` | Your Vercel domain | ✅ Yes |
| `AUTH_SECRET` | Generate with `openssl` | ✅ Yes |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | ✅ Yes |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | ✅ Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth | ⚠️ Optional |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | ⚠️ Optional |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI Studio | ⚠️ Optional |
| `MISTRAL_API_KEY` | Already provided | ⚠️ Optional |
| `BREVO_API_KEY` | Brevo/Sendinblue | ⚠️ Optional |
| `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` | Liveblocks dashboard | ✅ Yes |

---

## 🛠️ Troubleshooting

### Build fails with "Prisma error"
- Run: `npx prisma generate` locally first
- Push the generated files to GitHub
- Redeploy

### Database connection error
- Verify `DATABASE_URL` is correct in Vercel
- Check Neon IP allowlist: allow `0.0.0.0/0` for public access
- Test locally: `npx prisma db push`

### Authentication not working
- Verify `NEXTAUTH_URL` matches your domain
- Check OAuth redirect URIs include full path: `/api/auth/callback/google`
- Generate new `AUTH_SECRET` if issues persist

### 502 Bad Gateway
- Check application logs in Vercel
- Verify database is accessible
- Check all required env vars are set

---

## ✅ Post-Deployment Checklist

- [ ] Database running on Neon
- [ ] All env vars set in Vercel
- [ ] Application builds successfully
- [ ] Can login with Google OAuth
- [ ] Can create notes
- [ ] Real-time collaboration works (test in 2 tabs)
- [ ] AI features working (if API keys provided)
- [ ] PDF export working
- [ ] Email notifications working (if Brevo set up)

---

## 📞 Need Help?

- **Neon Issues**: https://neon.tech/docs
- **Vercel Issues**: https://vercel.com/support
- **NextAuth Issues**: https://authjs.dev
- **Prisma Issues**: https://prisma.io/docs

---

Happy deploying! 🎉
