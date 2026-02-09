# TODO-13: Launch

## Objective

Successfully launch Memory Quest on iOS and Android app stores.

## Duration: 1 week

## Dependencies

- TODO-12 (Testing complete)

---

## Pre-Launch Checklist

### Backend Ready

- [ ] Production database migrated
- [ ] Voice API endpoints working
- [ ] Whisper transcription configured
- [ ] S3 audio storage configured
- [ ] Push notification service running
- [ ] Cron jobs scheduled
- [ ] Error monitoring enabled (Sentry)
- [ ] API rate limiting configured
- [ ] SSL certificates valid

### App Ready

- [ ] Final build tested
- [ ] All critical bugs fixed
- [ ] Analytics integrated
- [ ] Crash reporting enabled
- [ ] Version numbers correct
- [ ] Release notes written

### Store Listings Ready

- [ ] iOS listing complete
- [ ] Android listing complete
- [ ] Screenshots uploaded
- [ ] Privacy policy URL live
- [ ] Support email configured

---

## iOS Launch

### Submit to App Store

```bash
# Ensure correct version
# Archive in Xcode
# Upload to App Store Connect
# Submit for review
```

- [ ] Create release build
- [ ] Archive in Xcode
- [ ] Upload to App Store Connect
- [ ] Fill in "What's New" (release notes)
- [ ] Submit for review
- [ ] Monitor review status

**Expected review time:** 24-48 hours

### Post-Approval

- [ ] Set release date (manual or automatic)
- [ ] Release to App Store
- [ ] Verify app appears in store
- [ ] Test download on real device

---

## Android Launch

### Submit to Google Play

```bash
# Build release AAB
cd android && ./gradlew bundleRelease
# Upload to Google Play Console
# Submit for review
```

- [ ] Create release AAB
- [ ] Upload to Google Play Console
- [ ] Fill in release notes
- [ ] Submit for review
- [ ] Monitor review status

**Expected review time:** 1-7 days

### Post-Approval

- [ ] Set rollout percentage (start with 10%)
- [ ] Monitor for crashes
- [ ] Increase rollout to 100%

---

## Launch Day Checklist

### Morning

- [ ] Verify backend is healthy
- [ ] Check database connections
- [ ] Verify push notifications working
- [ ] Team on standby for issues

### App Live

- [ ] Download from App Store
- [ ] Download from Google Play
- [ ] Complete full user flow
- [ ] Verify voice recording works
- [ ] Verify transcription works
- [ ] Verify streak tracking works

### Monitor

- [ ] Watch crash reports (Sentry/Firebase)
- [ ] Monitor error rates
- [ ] Check API response times
- [ ] Review user feedback

---

## Marketing & Announcement

### Announce Launch

- [ ] Email existing web users
- [ ] Post on social media
- [ ] Update website with app links
- [ ] App Store badges on website

### App Store Optimization (ASO)

- [ ] Monitor keyword rankings
- [ ] Track download numbers
- [ ] Respond to reviews
- [ ] Update screenshots if needed

---

## Post-Launch Week

### Day 1

- [ ] Monitor for critical issues
- [ ] Respond to early reviews
- [ ] Check crash-free rate

### Day 2-3

- [ ] Review analytics data
- [ ] Identify UX issues
- [ ] Prioritize fixes

### Day 4-7

- [ ] Release hotfix if needed
- [ ] Gather feature requests
- [ ] Plan v1.1 improvements

---

## Success Metrics (Week 1)

| Metric             | Target            |
| ------------------ | ----------------- |
| Downloads          | 100+              |
| Crash-free rate    | >99%              |
| Daily active users | 30%+ of downloads |
| Voice recordings   | 50%+ use voice    |
| App Store rating   | 4.0+              |
| Negative reviews   | <5                |

---

## Emergency Procedures

### Critical Bug Found

1. Assess severity
2. Decide: hotfix or disable feature
3. If hotfix: fast-track review (iOS: request expedited)
4. Communicate with users if needed

### Backend Down

1. Check Railway/hosting status
2. Restart services
3. Scale up if needed
4. Post status update if prolonged

### App Rejected

1. Review rejection reason
2. Fix issues
3. Resubmit with explanation
4. Appeal if unfair

---

## Celebrate! 🎉

When everything is live and stable:

- [ ] Team celebration
- [ ] Thank beta testers
- [ ] Share on social media
- [ ] Start planning v1.1

---

## Post-Launch Roadmap

### v1.1 (Week 2-4)

- Bug fixes from launch feedback
- Performance improvements
- Minor UX tweaks

### v1.2 (Month 2)

- Additional prompts
- Enhanced family features
- Improved transcription

### v2.0 (Month 3-4)

- AI conversation follow-ups
- Photo attachments
- Book/PDF export

---

**Congratulations on launching Memory Quest! 🚀**

_"Every family has a story worth preserving."_
