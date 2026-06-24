# 🚀 Vercel Deployment - Quick Setup

## Your Database Connection

✅ **DATABASE_URL** (Already configured):
```
postgresql://neondb_owner:npg_oDiKCt5WGj8Uep-jolly-butterfly-at@tgbjn.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require
```

✅ **AUTH_SECRET** (Already generated):
```
ed1840c8de588775f762e06385a375be67cdbc685807fab89eaa8933679fa192
```

---

## Deploy to Vercel in 5 Steps

### Step 1: Go to Vercel
1. Open https://vercel.com
2. Click "Sign up" → Sign up with GitHub
3. Click "Import Project"

### Step 2: Connect Repository
1. Select: `abdulmannanbhatti936-lgtm/lume_notes`
2. Click "Import"

### Step 3: Framework Detection
✅ Next.js is auto-selected
✅ Build command: `pnpm build`
✅ Install command: `pnpm install`

### Step 4: Add Environment Variables
In the "Environment Variables" section, add:

```
DATABASE_URL = postgresql://neondb_owner:npg_oDiKCt5WGj8Uep-jolly-butterfly-at@tgbjn.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require

NEXTAUTH_URL = (Vercel will auto-fill this - it will be https://your-project.vercel.app)

AUTH_SECRET = ed1840c8de588775f762e06385a375be67cdbc685807fab89eaa8933679fa192

MISTRAL_API_KEY = blBpx9sRhwvmi66PQz6sMcOkBQzBCf6D

NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY = (Optional - add if you have Liveblocks account)

GOOGLE_GENERATIVE_AI_API_KEY = (Optional - add if you want AI features)
```

### Step 5: Deploy!
1. Click "Deploy"
2. Wait 5-10 minutes for build
3. Your site will be live! 🎉

---

## After Deployment

### Initialize Database
Once deployed, you need to run migrations. Go to Vercel → Project → Deployments → Select latest → Logs → Run these commands:

```bash
npx prisma migrate deploy
npx prisma db seed
```

Or use Vercel CLI:
```bash
vercel env pull
npx prisma migrate deploy
npx prisma db seed
```

---

## Your Live URL

After deployment, your app will be at:
```
https://your-project-name.vercel.app
```

Update these places with your real URL:
- Vercel → Settings → Domains (add custom domain if you want)
- Update NEXTAUTH_URL if you use custom domain

---

## Optional: Add Google OAuth (For Login Feature)

If you want users to login with Google:

1. Go to https://console.cloud.google.com
2. Create new project: "lume-notes"
3. Enable Google+ API
4. Credentials → Create OAuth 2.0 Client ID
5. Add redirect URI: `https://your-project.vercel.app/api/auth/callback/google`
6. Copy Client ID & Secret
7. Add to Vercel:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

---

## Troubleshooting

**Build fails?**
- Check Vercel logs
- Run `npm run build` locally to test
- Verify all required vars are set

**Database connection error?**
- Verify DATABASE_URL is correct
- Check Neon → Settings → Allow public access

**Can't login?**
- Verify NEXTAUTH_URL matches your domain
- Check AUTH_SECRET is set correctly

---

## ✅ Ready?

1. Copy all env vars above
2. Go to https://vercel.com
3. Follow steps 1-5
4. Paste env vars
5. Click Deploy
6. Wait for green checkmark ✅
7. Visit your live app! 🚀

Questions? Ask me! 💪
