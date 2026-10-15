import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  cartFees,
  clampQty,
  isDimension,
  lineTotal,
  makeLine,
  missingHandlers,
  peso,
  pointsEarned,
  pointsToPeso,
  resolvePromo,
  seed,
  totals,
  type CartDiscount,
  type CartLine,
  type Customer,
  type PaymentMethod,
  type Product,
  type Sale,
} from '@simmy/core';
import { useStore } from '../store';
import { colors } from '../theme';

const QUICK_TENDER = [100, 200, 500, 1000];
const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: 'Cash' },
  { id: 'gcash', label: 'GCash' },
  { id: 'maya', label: 'Maya' },
  { id: 'card', label: 'Card' },
];

export function PosScreen({ onSignOut }: { onSignOut: () => void }) {
  const insets = useSafeAreaInsets();
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const salesCount = useStore((s) => s.sales.length);
  const currentUser = useStore((s) => s.currentUser);
  const recordSale = useStore((s) => s.recordSale);
  const settings = seed.settings;

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState<CartDiscount>({ kind: 'none' });
  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [redeemPts, setRedeemPts] = useState(false);
  const [areaProduct, setAreaProduct] = useState<Product | null>(null);
  const [custOpen, setCustOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [tendered, setTendered] = useState('');
  const [receipt, setReceipt] = useState<Sale | null>(null);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products
      .filter((p) => p.isActive)
      .filter((p) => cat === 'all' || p.categoryId === cat)
      .filter(
        (p) =>
          !needle ||
          p.name.toLowerCase().includes(needle) ||
          p.sku.toLowerCase().includes(needle) ||
          p.barcode === needle,
      );
  }, [products, q, cat]);

  const fees = useMemo(() => cartFees(lines, products, settings), [lines, products, settings]);
  const t = totals(lines, discount, settings, fees.reduce((a, f) => a + f.amount, 0));
  const redeemValue =
    redeemPts && customer
      ? Math.min(pointsToPeso(customer.loyaltyPoints, settings), t.total)
      : 0;
  const due = Math.max(0, t.total - redeemValue);
  const cash = Math.min(parseFloat(tendered) || 0, 999_999);
  const change = method === 'cash' ? cash - due : 0;

  const add = (p: Product) => {
    if (p.pricing === 'area') {
      setAreaProduct(p);
      return;
    }
    setLines((ls) => {
      const existing = ls.find((l) => l.productId === p.id && !l.area);
      if (existing)
        return ls.map((l) => (l.id === existing.id ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, makeLine(p, { handlerId: currentUser?.id })];
    });
  };

  const onSearchSubmit = () => {
    const needle = q.trim().toLowerCase();
    const exact = products.find(
      (p) => p.isActive && (p.sku.toLowerCase() === needle || p.barcode === needle),
    );
    const target = exact ?? (visible.length === 1 ? visible[0] : undefined);
    if (target) {
      add(target);
      setQ('');
    }
  };

  const setQty = (id: string, qty: number) =>
    setLines((ls) =>
      qty <= 0
        ? ls.filter((l) => l.id !== id)
        : ls.map((l) => (l.id === id ? { ...l, qty: clampQty(qty) } : l)),
    );

  const applyPromo = () => {
    if (!promoCode.trim()) {
      setDiscount({ kind: 'none' });
      setPromoMsg(null);
      return;
    }
    const res = resolvePromo(promoCode, lines, seed.promotions);
    if (res.ok) {
      setDiscount(res.discount);
      setPromoMsg(`${res.discount.label} applied`);
    } else {
      setDiscount({ kind: 'none' });
      setPromoMsg(res.error);
    }
  };

  const statutory = (kind: 'senior' | 'pwd') =>
    setDiscount(
      discount.kind === kind
        ? { kind: 'none' }
        : { kind, label: kind === 'senior' ? 'Senior citizen' : 'PWD' },
    );

  const completeSale = () => {
    const missing = missingHandlers(lines);
    if (missing.length) {
      Alert.alert(
        'Handler required',
        `Assign a handler to ${missing.length} item${missing.length === 1 ? '' : 's'} before completing the sale.`,
      );
      return;
    }
    try {
      const users = useStore.getState().users;
      const handlerName = (id?: string) => {
        const u = users.find((x) => x.id === id);
        return u ? `${u.firstName} ${u.lastName}` : undefined;
      };
      const sale: Sale = {
        id: `s-${Date.now()}`,
        invoiceNumber: `INV-2026-${String(842 + salesCount).padStart(4, '0')}`,
        createdAt: new Date().toISOString(),
        cashierName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Cashier',
        cashierId: currentUser?.id,
        branchId:
          seed.branches.find((b) => b.id === currentUser?.branchId)?.id ??
          seed.branches[0]?.id ?? '',
        branchName:
          seed.branches.find((b) => b.id === currentUser?.branchId)?.name ??
          seed.branches[0]?.name ?? 'Main',
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : undefined,
        lines: lines.map((l) => ({
          productId: l.productId,
          name: l.area ? `${l.name} — ${l.area.width}×${l.area.height} ${l.area.unit}` : l.name,
          qty: l.qty,
          unitPrice: l.unitPrice,
          total: lineTotal(l),
          handlerId: l.handlerId,
          handlerName: handlerName(l.handlerId),
        })),
        subtotal: t.subtotal,
        discountTotal: t.lineDiscounts + t.saleDiscount + redeemValue,
        fees,
        vatExempt: discount.kind === 'senior' || discount.kind === 'pwd',
        taxTotal: t.taxTotal,
        total: due,
        paymentMethod: method,
        amountTendered: method === 'cash' ? cash : due,
        change: Math.max(0, change),
        pointsEarned: customer ? pointsEarned(due, settings) : 0,
        status: 'completed',
      };
      recordSale(sale, discount.promoId);
      setReceipt(sale);
      setPayOpen(false);
      setLines([]);
      setCustomer(null);
      setDiscount({ kind: 'none' });
      setPromoCode('');
      setPromoMsg(null);
      setRedeemPts(false);
      setTendered('');
      setMethod('cash');
    } catch {
      Alert.alert('Sale failed', 'Could not save the sale — please try again.');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Register</Text>
          <Text style={styles.sub}>
            {settings.storeName} · {currentUser?.firstName ?? '—'}
          </Text>
        </View>
        <Pressable onPress={onSignOut} hitSlop={8}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      {/* Search / scan */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search or scan barcode…"
          placeholderTextColor={colors.stone[400]}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={onSearchSubmit}
          returnKeyType="search"
        />
      </View>

      {/* Category chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        data={[{ id: 'all', name: 'All' }, ...seed.categories]}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setCat(item.id)}
            style={[styles.chip, cat === item.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, cat === item.id && styles.chipTextActive]}>
              {item.name}
            </Text>
          </Pressable>
        )}
      />

      {/* Product grid */}
      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        numColumns={3}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        columnWrapperStyle={{ gap: 10 }}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.tile, pressed && { backgroundColor: colors.pine[50] }]}
            onPress={() => add(item)}
          >
            <Text numberOfLines={2} style={styles.tileName}>{item.name}</Text>
            <Text style={styles.tilePrice}>
              {peso(item.price)}
              {item.pricing === 'area' && <Text style={styles.tileUnit}>/{item.areaUnit}</Text>}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No products match “{q}”</Text>
        }
      />

      {/* Cart + checkout bar */}
      <View style={[styles.cartBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cartCount}>{lines.reduce((a, l) => a + l.qty, 0)} items</Text>
          <Text style={styles.cartTotal}>{peso(due)}</Text>
        </View>
        <Pressable
          style={[styles.reviewBtn, lines.length === 0 && { opacity: 0.4 }]}
          disabled={lines.length === 0}
          onPress={() => setPayOpen(true)}
        >
          <Text style={styles.reviewText}>Review &amp; charge</Text>
        </Pressable>
      </View>

      {/* Checkout sheet — cart review + discounts + payment in one modal */}
      <Modal visible={payOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <ScrollView>
              <Text style={styles.sheetLabel}>CURRENT SALE</Text>
              <Text style={styles.sheetTotal}>{peso(due)}</Text>

              {/* Lines with qty steppers */}
              {lines.map((l) => (
                <View key={l.id} style={styles.sheetLine}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.sheetLineName} numberOfLines={2}>
                      {l.name}
                      {l.area ? ` ${l.area.width}×${l.area.height}` : ''}
                    </Text>
                    <Text style={styles.sheetLineUnit}>{peso(l.unitPrice)}</Text>
                  </View>
                  <View style={styles.stepper}>
                    <Pressable style={styles.stepBtn} onPress={() => setQty(l.id, l.qty - 1)}>
                      <Text style={styles.stepTxt}>−</Text>
                    </Pressable>
                    <Text style={styles.stepQty}>{l.qty}</Text>
                    <Pressable style={styles.stepBtn} onPress={() => setQty(l.id, l.qty + 1)}>
                      <Text style={styles.stepTxt}>+</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.sheetLineTotal}>{peso(lineTotal(l))}</Text>
                </View>
              ))}

              {/* Customer */}
              <Pressable style={styles.rowBtn} onPress={() => setCustOpen(true)}>
                <Text style={styles.rowBtnText}>
                  {customer
                    ? `${customer.firstName} ${customer.lastName} · ${customer.loyaltyPoints.toLocaleString()} pts`
                    : '+ Attach customer'}
                </Text>
                {customer && (
                  <Pressable onPress={() => { setCustomer(null); setDiscount({ kind: 'none' }); setRedeemPts(false); }} hitSlop={8}>
                    <Text style={styles.rowBtnX}>×</Text>
                  </Pressable>
                )}
              </Pressable>

              {/* Discounts */}
              <View style={styles.discRow}>
                {(customer?.isSeniorCitizen || customer?.isPwd) && (
                  <>
                    <Pressable
                      style={[styles.discChip, discount.kind === 'senior' && styles.discChipOn]}
                      onPress={() => statutory('senior')}
                    >
                      <Text style={styles.discChipTxt}>Senior</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.discChip, discount.kind === 'pwd' && styles.discChipOn]}
                      onPress={() => statutory('pwd')}
                    >
                      <Text style={styles.discChipTxt}>PWD</Text>
                    </Pressable>
                  </>
                )}
                <Pressable
                  style={[styles.discChip, discount.kind === 'manual' && styles.discChipOn]}
                  onPress={() =>
                    setDiscount(
                      discount.kind === 'manual'
                        ? { kind: 'none' }
                        : { kind: 'manual', pct: 10, label: 'Manual 10%' },
                    )
                  }
                >
                  <Text style={styles.discChipTxt}>10% off</Text>
                </Pressable>
                {customer && customer.loyaltyPoints > 0 && (
                  <Pressable
                    style={[styles.discChip, redeemPts && styles.discChipOn]}
                    onPress={() => setRedeemPts((r) => !r)}
                  >
                    <Text style={styles.discChipTxt}>Use points</Text>
                  </Pressable>
                )}
              </View>

              {/* Promo code */}
              <View style={styles.promoRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Promo code"
                  placeholderTextColor={colors.stone[400]}
                  autoCapitalize="characters"
                  value={promoCode}
                  onChangeText={setPromoCode}
                />
                <Pressable style={styles.promoBtn} onPress={applyPromo}>
                  <Text style={styles.promoBtnTxt}>Apply</Text>
                </Pressable>
              </View>
              {promoMsg && <Text style={styles.promoMsg}>{promoMsg}</Text>}

              {/* Totals */}
              <View style={styles.totals}>
                <View style={styles.totRow}>
                  <Text style={styles.totLabel}>Subtotal</Text>
                  <Text style={styles.totVal}>{peso(t.subtotal)}</Text>
                </View>
                {t.saleDiscount + t.lineDiscounts + redeemValue > 0 && (
                  <View style={styles.totRow}>
                    <Text style={styles.totLabel}>Discounts</Text>
                    <Text style={[styles.totVal, { color: colors.clay }]}>
                      −{peso(t.saleDiscount + t.lineDiscounts + redeemValue)}
                    </Text>
                  </View>
                )}
                <View style={styles.totRow}>
                  <Text style={styles.totLabel}>
                    {t.vatExemptAmount > 0 ? 'VAT-exempt sale' : 'VAT (12%)'}
                  </Text>
                  <Text style={styles.totVal}>
                    {t.vatExemptAmount > 0 ? 'exempt' : peso(t.taxTotal)}
                  </Text>
                </View>
                <View style={styles.totRow}>
                  <Text style={[styles.totLabel, styles.totBig]}>Total due</Text>
                  <Text style={[styles.totVal, styles.totBig]}>{peso(due)}</Text>
                </View>
              </View>

              {/* Payment method */}
              <Text style={styles.label}>PAYMENT METHOD</Text>
              <View style={styles.discRow}>
                {METHODS.map((m) => (
                  <Pressable
                    key={m.id}
                    style={[styles.discChip, method === m.id && styles.discChipOn]}
                    onPress={() => setMethod(m.id)}
                  >
                    <Text style={styles.discChipTxt}>{m.label}</Text>
                  </Pressable>
                ))}
              </View>

              {method === 'cash' && (
                <>
                  <View style={styles.quickRow}>
                    {QUICK_TENDER.map((v) => (
                      <Pressable
                        key={v}
                        style={styles.quickBtn}
                        onPress={() => setTendered(String(v))}
                      >
                        <Text style={styles.quickTxt}>₱{v}</Text>
                      </Pressable>
                    ))}
                    <Pressable style={styles.quickBtn} onPress={() => setTendered(String(due))}>
                      <Text style={styles.quickTxt}>Exact</Text>
                    </Pressable>
                  </View>
                  <TextInput
                    style={styles.cashInput}
                    keyboardType="decimal-pad"
                    placeholder="Amount tendered"
                    placeholderTextColor={colors.stone[400]}
                    value={tendered}
                    onChangeText={(v) => setTendered(v.replace(/[^0-9.]/g, ''))}
                  />
                  {cash >= due && due > 0 && (
                    <Text style={styles.change}>Change: {peso(cash - due)}</Text>
                  )}
                </>
              )}

              <View style={styles.sheetButtons}>
                <Pressable style={styles.cancelBtn} onPress={() => setPayOpen(false)}>
                  <Text style={styles.cancelText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.doneBtn, (method === 'cash' && cash < due) && { opacity: 0.4 }]}
                  disabled={method === 'cash' && cash < due}
                  onPress={completeSale}
                >
                  <Text style={styles.doneText}>
                    Charge {peso(due)}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Receipt confirmation */}
      <Modal visible={!!receipt} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { maxHeight: '70%' }]}>
            <Text style={styles.sheetLabel}>SALE COMPLETE</Text>
            <Text style={styles.sheetTotal}>{receipt && peso(receipt.total)}</Text>
            <Text style={styles.receiptMeta}>
              {receipt?.invoiceNumber} · {receipt?.paymentMethod.toUpperCase()}
              {receipt?.customerName ? ` · ${receipt.customerName}` : ''}
            </Text>
            {receipt && receipt.change > 0 && (
              <Text style={styles.change}>Change: {peso(receipt.change)}</Text>
            )}
            {receipt && receipt.pointsEarned > 0 && (
              <Text style={styles.earned}>+{receipt.pointsEarned} loyalty points earned</Text>
            )}
            <Pressable style={[styles.doneBtn, { marginTop: 20 }]} onPress={() => setReceipt(null)}>
              <Text style={styles.doneText}>New sale</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Customer picker */}
      <Modal visible={custOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.label}>ATTACH CUSTOMER</Text>
            <FlatList
              data={customers}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 340 }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.custRow}
                  onPress={() => {
                    setCustomer(item);
                    setCustOpen(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.custName}>
                      {item.firstName} {item.lastName}
                      {(item.isSeniorCitizen || item.isPwd) && (
                        <Text style={{ color: colors.clay }}>
                          {'  '}{item.isSeniorCitizen ? 'SC' : 'PWD'}
                        </Text>
                      )}
                    </Text>
                    <Text style={styles.custMeta}>{item.code} · {item.tier}</Text>
                  </View>
                  <Text style={styles.custPts}>{item.loyaltyPoints.toLocaleString()} pts</Text>
                </Pressable>
              )}
            />
            <Pressable style={[styles.cancelBtn, { marginTop: 12 }]} onPress={() => setCustOpen(false)}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Area size modal */}
      <Modal visible={!!areaProduct} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.label}>SIZE — {areaProduct?.name.toUpperCase()}</Text>
            <AreaForm
              onCancel={() => setAreaProduct(null)}
              onAdd={(w, h) => {
                if (areaProduct) setLines((ls) => [...ls, makeLine(areaProduct, { width: w, height: h, handlerId: currentUser?.id })]);
                setAreaProduct(null);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AreaForm({
  onAdd,
  onCancel,
}: {
  onAdd: (w: number, h: number) => void;
  onCancel: () => void;
}) {
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    const ww = parseFloat(w), hh = parseFloat(h);
    if (!isDimension(ww) || !isDimension(hh)) {
      setErr('Enter width and height between 0.1 and 500.');
      return;
    }
    onAdd(ww, hh);
  };
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Width (ft)"
          placeholderTextColor={colors.stone[400]}
          keyboardType="decimal-pad"
          value={w}
          onChangeText={setW}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Height (ft)"
          placeholderTextColor={colors.stone[400]}
          keyboardType="decimal-pad"
          value={h}
          onChangeText={setH}
        />
      </View>
      {err && <Text style={styles.promoMsg}>{err}</Text>}
      <View style={styles.sheetButtons}>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.doneBtn} onPress={submit}>
          <Text style={styles.doneText}>Add to sale</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink },
  sub: { fontSize: 12, color: colors.stone[500] },
  signOut: { fontSize: 13, color: colors.clay, fontWeight: '600' },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  search: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.stone[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
  },
  chips: { flexGrow: 0, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.stone[200],
  },
  chipActive: { backgroundColor: colors.pine[800], borderColor: colors.pine[800] },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.stone[500] },
  chipTextActive: { color: '#fff' },
  tile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stone[200],
    padding: 12,
    minHeight: 86,
    justifyContent: 'space-between',
  },
  tileName: { fontSize: 13, fontWeight: '500', color: colors.ink, lineHeight: 17 },
  tilePrice: { fontSize: 15, fontWeight: '700', color: colors.pine[800], marginTop: 6 },
  tileUnit: { fontSize: 10, fontWeight: '400', color: colors.stone[400] },
  empty: { textAlign: 'center', color: colors.stone[400], marginTop: 40 },
  cartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.pine[950],
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  cartCount: { fontSize: 12, color: colors.pine[100] },
  cartTotal: { fontSize: 22, fontWeight: '700', color: '#fff' },
  reviewBtn: {
    backgroundColor: colors.pine[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  reviewText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,31,25,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '92%',
  },
  sheetLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: colors.stone[500],
    textAlign: 'center',
  },
  sheetTotal: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.pine[800],
    textAlign: 'center',
    marginBottom: 10,
  },
  sheetLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.stone[200],
  },
  sheetLineName: { fontSize: 14, color: colors.ink },
  sheetLineUnit: { fontSize: 11, color: colors.stone[400] },
  sheetLineTotal: { fontSize: 14, fontWeight: '600', color: colors.ink, marginLeft: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.stone[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTxt: { fontSize: 16, color: colors.ink, lineHeight: 18 },
  stepQty: { minWidth: 18, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.stone[300],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 12,
  },
  rowBtnText: { fontSize: 14, color: colors.stone[500] },
  rowBtnX: { fontSize: 18, color: colors.stone[400], paddingHorizontal: 6 },
  discRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  discChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.stone[100],
  },
  discChipOn: { backgroundColor: colors.pine[700] },
  discChipTxt: { fontSize: 13, fontWeight: '600', color: colors.ink },
  promoRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  promoBtn: {
    backgroundColor: colors.pine[800],
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  promoBtnTxt: { color: '#fff', fontWeight: '600', fontSize: 13 },
  promoMsg: { marginTop: 6, fontSize: 12, color: colors.stone[500] },
  totals: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.stone[200], paddingTop: 10 },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totLabel: { fontSize: 13, color: colors.stone[500] },
  totVal: { fontSize: 13, color: colors.ink, fontWeight: '500' },
  totBig: { fontSize: 17, fontWeight: '700', color: colors.ink },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: colors.stone[500],
    marginTop: 14,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.stone[300],
    borderRadius: 10,
    padding: 11,
    fontSize: 15,
    color: colors.ink,
  },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.stone[100],
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  quickTxt: { fontSize: 13, fontWeight: '600', color: colors.ink },
  cashInput: {
    borderWidth: 1,
    borderColor: colors.stone[300],
    borderRadius: 10,
    padding: 12,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.ink,
    marginTop: 10,
  },
  change: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: colors.pine[700],
  },
  earned: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 13,
    color: colors.brass,
    fontWeight: '600',
  },
  receiptMeta: { textAlign: 'center', fontSize: 13, color: colors.stone[500], marginTop: -4 },
  sheetButtons: { flexDirection: 'row', gap: 10, marginTop: 18, marginBottom: 8 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.stone[300],
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelText: { color: colors.stone[500], fontWeight: '600' },
  doneBtn: {
    flex: 2,
    backgroundColor: colors.pine[800],
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  custRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.stone[200],
  },
  custName: { fontSize: 15, fontWeight: '500', color: colors.ink },
  custMeta: { fontSize: 12, color: colors.stone[400] },
  custPts: { fontSize: 13, color: colors.stone[500] },
});
