import { ActivityIndicator, StyleSheet, TextInput } from 'react-native';
import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { useCheckout } from '@/components/checkout-provider';
import { AccountPanel } from '@/components/account-panel';
import { ThemedText } from '@/components/themed-text';
import { OrderButton, OrderPanel, OrderScreen } from '@/components/order-ui';
import { OrderConfirmation } from '@/components/order-confirmation';
import { useCheckoutReview } from '@/hooks/use-checkout-review';
import { cartTotal } from '@/lib/cart-store';
import { formatPrice } from '@/lib/products';
import { Brand } from '@/constants/brand';

export default function CheckoutScreen() {
  const auth = useAuth(); const cart = useCart(); const checkout = useCheckout();
  const owner = auth.session?.user.id ?? null;
  const review = useCheckoutReview(owner, cart.ready, cart.checkoutSnapshot);
  const [submittedReview, setSubmittedReview] = useState<typeof review.review>(null);
  const [draft, setDraft] = useState({ owner, text: '' });
  const instructions = draft.owner === owner ? draft.text : '';
  const confirmedId = checkout.confirmation?.order.id;
  const refreshCart = cart.refreshCart;
  useEffect(() => { if (confirmedId) void refreshCart(); }, [confirmedId, refreshCart]);
  const lines = review.review?.lines ?? [];
  const products = new Map(cart.menu.products.map((product) => [product.id, product]));
  const priced = lines.length > 0 && lines.every((line) => { const product = products.get(line.productId); return product && Number.isSafeInteger(product.price) && product.price >= 0; });
  const canPlace = Boolean(owner && checkout.ready && review.review && !(checkout.conflict && review.review === submittedReview) && !review.loading && priced && cart.menu.status === 'ready' && !cart.pending && !cart.error && !cart.syncing);
  async function submit() {
    if (!owner || (!checkout.request && !canPlace)) return;
    setSubmittedReview(review.review);
    await checkout.submit(owner, review.review?.revision ?? null, instructions);
  }
  return <OrderScreen>
    <ThemedText type="smallBold" style={{ color: Brand.orange }}>ROLL N SPICE.</ThemedText>
    <ThemedText type="title">CHECKOUT</ThemedText>
    {auth.loading ? <ActivityIndicator color={Brand.orange} accessibilityLabel="Restoring account" /> : !owner ? <>
      <ThemedText>Sign in to place your order.</ThemedText><AccountPanel />
      <Link href="/cart" asChild><OrderButton label="Return to cart" /></Link>
    </> : <>
      <ThemedText type="small">Ordering as {auth.session?.user.email ?? 'your signed-in account'}</ThemedText>
      {!checkout.ready ? <OrderPanel><ThemedText>{checkout.error || 'Loading checkout…'}</ThemedText><OrderButton label="Try again" onPress={checkout.retryLoad} /></OrderPanel> : <>
        {checkout.confirmation ? <>
          <OrderConfirmation result={checkout.confirmation} />
          {!checkout.request ? <OrderButton label="Start another order" disabled={checkout.busy} onPress={() => { checkout.startNew(); void review.refresh(); }} /> : null}
        </> : checkout.request ? <OrderPanel>
          <ThemedText type="subtitle">CHECK YOUR ORDER</ThemedText>
          <ThemedText>We couldn’t confirm your last attempt. Tap Check order status before ordering again.</ThemedText>
          <ThemedText>Instructions: {checkout.request.special_instructions || 'None'}</ThemedText>
        </OrderPanel> : <>
          {review.loading ? <ActivityIndicator color={Brand.orange} accessibilityLabel="Loading your cart" /> : null}
          {review.error ? <ThemedText accessibilityLiveRegion="polite">{review.error}</ThemedText> : null}
          {lines.length ? <OrderPanel>
            <ThemedText type="subtitle">YOUR ORDER</ThemedText>
            {lines.map((line) => <ThemedText key={line.productId}>{line.quantity} × {products.get(line.productId)?.name ?? 'Unavailable item'}{products.has(line.productId) ? ` · ${formatPrice(products.get(line.productId)!.price * line.quantity)}` : ''}</ThemedText>)}
            <ThemedText type="smallBold">{cart.menu.status === 'ready' && priced ? `TOTAL: ${formatPrice(cartTotal(lines, cart.menu.products))}` : 'Prices could not load. Refresh before ordering.'}</ThemedText>
            <ThemedText type="small">Delivery charges are not included.</ThemedText>
          </OrderPanel> : null}
          <OrderPanel>
            <ThemedText type="smallBold">Special instructions (optional)</ThemedText>
            <TextInput accessibilityLabel="Special instructions, maximum 250 characters" multiline maxLength={250} editable={!checkout.busy}
              value={instructions} onChangeText={(text) => setDraft({ owner, text })} placeholder="Tell us about your order" placeholderTextColor={Brand.muted} style={styles.input} />
            <ThemedText type="small">{instructions.length}/250</ThemedText>
          </OrderPanel>
          <OrderButton label="Refresh cart" disabled={checkout.busy || review.loading} onPress={() => { cart.menu.retry(); void review.refresh(); }} />
          <Link href="/cart" asChild><OrderButton label="Edit cart" disabled={checkout.busy} /></Link>
        </>}
        {checkout.error ? <ThemedText accessibilityLiveRegion="polite">{checkout.error}</ThemedText> : null}
        {checkout.conflict ? <ThemedText>Refresh your cart to continue.</ThemedText> : null}
        {checkout.request || !checkout.confirmation ? <OrderButton label={checkout.busy ? 'Confirming order…' : checkout.request ? 'Check order status' : 'Place order'}
          disabled={checkout.busy || (!checkout.request && !canPlace)} onPress={() => { void submit(); }} /> : null}
      </>}
    </>}
  </OrderScreen>;
}
const styles = StyleSheet.create({ input: { minHeight: 110, borderWidth: 1, borderColor: Brand.muted, borderRadius: 12, padding: 14, color: Brand.charcoal, fontFamily: Brand.body, fontSize: 16, textAlignVertical: 'top' } });
