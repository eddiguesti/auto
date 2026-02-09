# TODO-10: Premium Features & In-App Purchases

## Objective

Implement subscription tiers and in-app purchases.

## Duration: 2 weeks

## Dependencies

- TODO-09 (Offline Support)

---

## Pricing Tiers

| Feature        | Free      | Premium ($4.99/mo) | Family ($9.99/mo) |
| -------------- | --------- | ------------------ | ----------------- |
| Daily prompts  | 1/day     | Unlimited          | Unlimited         |
| Collections    | 3         | All 8+             | All 8+            |
| Streak freezes | 0         | 2/month            | 2/month each      |
| Family circle  | 3 members | 3 members          | 6 members         |
| Audio storage  | 30 days   | 1 year             | 1 year            |
| Export to PDF  | ❌        | ✅                 | ✅                |
| Ad-free        | ❌        | ✅                 | ✅                |

---

## Tasks

### Task 10.1: Setup RevenueCat

```bash
npm install react-native-purchases
cd ios && pod install && cd ..
```

**Configure in App Store Connect:**

- Create subscription products
- Set up pricing
- Configure subscription groups

**Configure in Google Play Console:**

- Create subscription products
- Set up pricing

- [ ] Install RevenueCat SDK
- [ ] Configure iOS subscriptions
- [ ] Configure Android subscriptions

---

### Task 10.2: Create Purchase Service

**Create:** `src/services/purchases.ts`

```typescript
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases'
import { Platform } from 'react-native'

const API_KEYS = {
  ios: process.env.REVENUECAT_IOS_KEY,
  android: process.env.REVENUECAT_ANDROID_KEY
}

class PurchaseService {
  async init(userId: string) {
    Purchases.setDebugLogsEnabled(__DEV__)
    await Purchases.configure({
      apiKey: Platform.OS === 'ios' ? API_KEYS.ios! : API_KEYS.android!,
      appUserID: userId
    })
  }

  async getOfferings() {
    const offerings = await Purchases.getOfferings()
    return offerings.current
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.purchasePackage(pkg)
    return customerInfo
  }

  async restorePurchases(): Promise<CustomerInfo> {
    return Purchases.restorePurchases()
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    return Purchases.getCustomerInfo()
  }

  isPremium(customerInfo: CustomerInfo): boolean {
    return (
      customerInfo.entitlements.active['premium'] !== undefined ||
      customerInfo.entitlements.active['family'] !== undefined
    )
  }

  isFamily(customerInfo: CustomerInfo): boolean {
    return customerInfo.entitlements.active['family'] !== undefined
  }
}

export default new PurchaseService()
```

- [ ] Create purchase service
- [ ] Initialize RevenueCat
- [ ] Handle purchase flow

---

### Task 10.3: Create Subscription Context

**Create:** `src/context/SubscriptionContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import purchaseService from '../services/purchases';
import { useAuth } from './AuthContext';

interface SubscriptionState {
  isPremium: boolean;
  isFamily: boolean;
  isLoading: boolean;
}

const SubscriptionContext = createContext<{
  state: SubscriptionState;
  refresh: () => Promise<void>;
} | null>(null);

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    isPremium: false,
    isFamily: false,
    isLoading: true,
  });

  const refresh = async () => {
    try {
      const customerInfo = await purchaseService.getCustomerInfo();
      setState({
        isPremium: purchaseService.isPremium(customerInfo),
        isFamily: purchaseService.isFamily(customerInfo),
        isLoading: false,
      });
    } catch (error) {
      setState(s => ({ ...s, isLoading: false }));
    }
  };

  useEffect(() => {
    if (user) {
      purchaseService.init(user.id.toString()).then(refresh);
    }
  }, [user]);

  return (
    <SubscriptionContext.Provider value={{ state, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}
```

- [ ] Create subscription context
- [ ] Check entitlements on app start
- [ ] Provide isPremium/isFamily flags

---

### Task 10.4: Create Paywall Screen

**Create:** `src/screens/PaywallScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import purchaseService from '../services/purchases';
import { useSubscription } from '../context/SubscriptionContext';
import { colors, spacing } from '../utils/theme';

export default function PaywallScreen({ navigation }) {
  const { refresh } = useSubscription();
  const [offerings, setOfferings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    const current = await purchaseService.getOfferings();
    setOfferings(current);
    setLoading(false);
  };

  const handlePurchase = async (pkg) => {
    setPurchasing(true);
    try {
      await purchaseService.purchasePackage(pkg);
      await refresh();
      navigation.goBack();
    } catch (error) {
      if (!error.userCancelled) {
        Alert.alert('Purchase Failed', error.message);
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      await purchaseService.restorePurchases();
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.sepia} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upgrade to Premium</Text>
      <Text style={styles.subtitle}>Unlock all features</Text>

      {/* Feature list */}
      <View style={styles.features}>
        <FeatureRow icon="🎙️" text="Unlimited daily prompts" />
        <FeatureRow icon="📚" text="All 8+ memory collections" />
        <FeatureRow icon="🛡️" text="2 streak freezes per month" />
        <FeatureRow icon="📖" text="Export memories to PDF book" />
        <FeatureRow icon="☁️" text="1 year audio storage" />
      </View>

      {/* Packages */}
      {offerings?.availablePackages.map(pkg => (
        <TouchableOpacity
          key={pkg.identifier}
          style={styles.packageButton}
          onPress={() => handlePurchase(pkg)}
          disabled={purchasing}
        >
          <Text style={styles.packageTitle}>{pkg.product.title}</Text>
          <Text style={styles.packagePrice}>
            {pkg.product.priceString}/month
          </Text>
        </TouchableOpacity>
      ))}

      {/* Restore */}
      <TouchableOpacity style={styles.restore} onPress={handleRestore}>
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>
    </View>
  );
}

function FeatureRow({ icon, text }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

// ... styles
```

- [ ] Create paywall screen
- [ ] Display subscription options
- [ ] Handle purchase flow
- [ ] Handle restore purchases

---

### Task 10.5: Gate Premium Features

```typescript
// Example: Gate extra prompts
function HomeScreen() {
  const { state: { isPremium } } = useSubscription();
  const [promptsToday, setPromptsToday] = useState(0);

  const canAnswerMorePrompts = isPremium || promptsToday < 1;

  if (!canAnswerMorePrompts) {
    return <UpgradePrompt />;
  }

  // Show prompt...
}
```

- [ ] Gate unlimited prompts
- [ ] Gate extra collections
- [ ] Gate streak freezes
- [ ] Gate PDF export

---

### Task 10.6: Backend Entitlement Verification

```javascript
// Verify subscription server-side for sensitive operations
router.post(
  '/export/pdf',
  asyncHandler(async (req, res) => {
    const userId = req.user.id

    // Verify premium status with RevenueCat
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.REVENUECAT_API_KEY}`
      }
    })

    const subscriber = await response.json()
    const isPremium = subscriber.subscriber.entitlements.premium?.is_active

    if (!isPremium) {
      return res.status(403).json({ error: 'Premium required' })
    }

    // Generate PDF...
  })
)
```

- [ ] Add server-side verification
- [ ] Verify before sensitive operations

---

## Verification Checklist

- [ ] RevenueCat initialized correctly
- [ ] Subscription offerings display
- [ ] Purchase flow works
- [ ] Restore purchases works
- [ ] Premium features gated correctly
- [ ] Server-side verification works

---

## Next Step

When complete, proceed to **TODO-11-APP-STORE.md**
