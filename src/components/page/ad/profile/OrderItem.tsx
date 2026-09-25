import { memo, useMemo } from "react";
import { CheckCircle2, Clock, RotateCcw } from "lucide-react";
import type { OrderData } from "@/lib/api/types/api/paddle/orders/OrderData";

interface OrderItemProps {
    orderData: OrderData;
}

function OrderItem({
    orderData,
}: OrderItemProps) {
    const formattedDate = useMemo(() => {
        return new Date(orderData.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }, [orderData.createdAt]);

    const formattedAmount = useMemo(() => {
        const amount = orderData.totalAmount / 100;
        const fixedAmount = amount % 1 === 0
            ? amount.toFixed(0)
            : amount.toFixed(2);
        return `${fixedAmount} ${orderData.currency.toUpperCase()}`;
    }, [orderData.totalAmount, orderData.currency]);

    const statusInfo = useMemo(() => {
        switch (orderData.status.toLowerCase()) {
            case 'paid':
                return { icon: <CheckCircle2 size={16} className="text-green-500" />, text: 'Paid' };
            case 'pending':
                return { icon: <Clock size={16} className="text-yellow-500" />, text: 'Pending' };
            case 'refunded':
                return { icon: <RotateCcw size={16} className="text-red-500" />, text: 'Refunded' };
            case 'partially_refunded':
                return { icon: <RotateCcw size={16} className="text-orange-500" />, text: 'Partially Refunded' };
            default:
                return { icon: <Clock size={16} className="text-text2" />, text: orderData.status };
        }
    }, [orderData.status]);

    return (
        <div className="grid grid-cols-4 items-center gap-4 rounded-xl border border-hairline bg-surface/60 p-4">
            <div className="min-w-0">
                <p className="truncate font-medium text-text1">{orderData.productName}</p>
                {orderData.kind === 'upgrade' && (
                    <p className="mt-0.5 text-[11px] font-medium text-text2">Upgrade top-up</p>
                )}
            </div>
            <div className="text-end">
                <p className="font-semibold text-text1">{formattedAmount}</p>
            </div>
            <div className="flex items-center justify-start gap-2">
                {statusInfo.icon}
                <span className="text-[11px] font-bold tracking-wider text-text2 uppercase">
                    {statusInfo.text}
                </span>
            </div>
            <div>
                <p className="text-end text-[13px] font-medium text-text2">{formattedDate}</p>
            </div>
        </div>
    );
}

export default memo(OrderItem);
