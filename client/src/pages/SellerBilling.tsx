/**
 * SellerBilling — shows a seller their outstanding fees and PBZ payment instructions.
 * Accessible from the seller dashboard sidebar.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/useToast';
import {
  Building2, CheckCircle, Clock, AlertCircle,
  Copy, RefreshCw, CreditCard, Receipt, X
} from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`, 'Content-Type': 'application/json' });

const typeLabel: Record<string, string> = {
  registration: 'Registration Fee',
  subscription: 'Monthly Ads Fee',
  commission:   'Sales Commission (5%)'
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  unpaid: { label: 'Unpaid',  color: 'bg-red-100 text-red-700 border-red-200',    icon: AlertCircle },
  paid:   { label: 'Paid',    color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  waived: { label: 'Waived',  color: 'bg-gray-100 text-gray-600 border-gray-200',  icon: CheckCircle }
};

export default function SellerBilling() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [refInput, setRefInput] = useState<Record<string, string>>({});
  const [showPayModal, setShowPayModal] = useState<any>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/billing/my`, { headers: authH() });
      const d = await res.json();
      if (d.success) setData(d.data);
    } catch { toast({ title: 'Failed to load billing', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submitPayment = async (billingId: string) => {
    const ref = refInput[billingId]?.trim();
    if (!ref) { toast({ title: 'Enter your payment reference', variant: 'destructive' }); return; }
    setSubmitting(billingId);
    try {
      const res = await fetch(`${BASE}/api/billing/my/submit-payment`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ billingId, paymentReference: ref })
      });
      const d = await res.json();
      if (d.success) {
        toast({ title: 'Reference submitted!', description: 'BHABY GROUP LTD will confirm within 24 hours.' });
        setShowPayModal(null);
        load();
      } else {
        toast({ title: 'Error', description: d.error, variant: 'destructive' });
      }
    } catch { toast({ title: 'Network error', variant: 'destructive' }); }
    finally { setSubmitting(null); }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!' });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
    </div>
  );

  const payInfo = data?.paymentInfo;
  const unpaid = (data?.records || []).filter((r: any) => r.status === 'unpaid');
  const paid   = (data?.records || []).filter((r: any) => r.status === 'paid');

  return (
    <div className="space-y-6">
      <p className="text-gray-500 text-sm">Fees owed to BHABY GROUP LTD for using E-Shop platform</p>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Outstanding Balance</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-red-700 truncate">TZS {(data?.summary?.totalOwed || 0).toLocaleString()}</p>
            <p className="text-xs text-red-500 mt-1">{unpaid.length} unpaid item{unpaid.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Total Paid</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-green-700 truncate">TZS {(data?.summary?.totalPaid || 0).toLocaleString()}</p>
            <p className="text-xs text-green-500 mt-1">{paid.length} payment{paid.length !== 1 ? 's' : ''} confirmed</p>
          </CardContent>
        </Card>
      </div>

      {/* PBZ Payment Instructions */}
      {payInfo && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-900">
              <Building2 className="w-5 h-5" />How to Pay — Bank Transfer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-white rounded-xl p-4 space-y-3">
              {[
                { label: 'Bank', value: payInfo.bankName },
                { label: 'Account Name', value: payInfo.accountName },
                { label: 'Account Number', value: payInfo.accountNumber },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-gray-900">{row.value}</span>
                    <button onClick={() => copy(row.value)} className="text-blue-500 hover:text-blue-700">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">⚠ Important:</p>
              <p>• Use your invoice number as the payment reference</p>
              <p>• After paying, click "I've Paid" on the invoice and enter your bank reference number</p>
              <p>• BHABY GROUP LTD will confirm your payment within 24 hours</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing records */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />Invoice History
            </CardTitle>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(data?.records || []).length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No billing records yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(data?.records || []).map((r: any) => {
                const cfg = statusConfig[r.status] || statusConfig.unpaid;
                const Icon = cfg.icon;
                return (
                  <div key={r._id} className={`flex flex-wrap items-start gap-3 p-4 rounded-xl border ${r.status === 'unpaid' ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-white'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{typeLabel[r.type] || r.type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                      {r.dueDate && r.status === 'unpaid' && (
                        <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />Due: {new Date(r.dueDate).toLocaleDateString('en-GB')}
                        </p>
                      )}
                      {r.paidAt && (
                        <p className="text-xs text-green-600 mt-0.5">Confirmed: {new Date(r.paidAt).toLocaleDateString('en-GB')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <p className="font-extrabold text-gray-900 text-sm">TZS {r.amount.toLocaleString()}</p>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
                        <Icon className="w-3 h-3" />{cfg.label}
                      </span>
                      {r.status === 'unpaid' && (
                        <Button size="sm" onClick={() => setShowPayModal(r)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1">
                          <CreditCard className="w-3.5 h-3.5" />I've Paid
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit payment reference modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Submit Payment Reference</h3>
              <button onClick={() => setShowPayModal(null)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
              <p className="font-semibold text-gray-900">{typeLabel[showPayModal.type]}</p>
              <p className="text-blue-600 font-bold text-lg">TZS {showPayModal.amount.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Pay to: {payInfo?.accountName} · {payInfo?.accountNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Bank Transaction Reference Number
              </label>
              <Input
                placeholder="e.g. PBZ2024051234567"
                value={refInput[showPayModal._id] || ''}
                onChange={e => setRefInput(prev => ({ ...prev, [showPayModal._id]: e.target.value }))}
                className="h-11 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">This is the reference number from your bank receipt or SMS</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPayModal(null)}>Cancel</Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={submitting === showPayModal._id}
                onClick={() => submitPayment(showPayModal._id)}
              >
                {submitting === showPayModal._id ? 'Submitting…' : 'Submit Reference'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
