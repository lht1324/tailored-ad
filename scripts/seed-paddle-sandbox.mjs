// Paddle 샌드박스 카탈로그 시드 — TailoredAd Starter/Growth/Pro (월간만, trial 없음).
// 실행: PADDLE_SANDBOX_API_KEY가 환경에 있어야 함. `node scripts/seed-paddle-sandbox.mjs`
// MCP execute가 결과를 반환하지 않아 REST 직호출로 대체 (에러 가시성 확보).
//冪等 아님 — 중복 실행 시 상품이 중복 생성되니 1회만 실행할 것.

const API = "https://sandbox-api.paddle.com";
const KEY = process.env.PADDLE_SANDBOX_API_KEY;
if (!KEY) {
    console.error("PADDLE_SANDBOX_API_KEY is not set.");
    process.exit(1);
}

const DEFS = [
    { name: "TailoredAd Starter", desc: "100 ad images a month. Unused images never expire.", plan: "plan-1", images: 100, amount: "1900" },
    { name: "TailoredAd Growth", desc: "500 ad images a month. Unused images never expire.", plan: "plan-2", images: 500, amount: "4900" },
    { name: "TailoredAd Pro", desc: "1,000 ad images a month. Unused images never expire.", plan: "plan-3", images: 1000, amount: "9900" },
];

async function call(method, path, body) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: {
            "Authorization": `Bearer ${KEY}`,
            "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data).slice(0, 500)}`);
    }
    return data.data;
}

async function main() {
    const out = [];
    for (const d of DEFS) {
        const product = await call("POST", "/products", {
            name: d.name,
            tax_category: "saas",
            description: d.desc,
        });
        const price = await call("POST", "/prices", {
            product_id: product.id,
            name: "Monthly",
            description: `${d.name} monthly USD`,
            unit_price: { amount: d.amount, currency_code: "USD" },
            billing_cycle: { interval: "month", frequency: 1 },
            custom_data: { plan: d.plan, imageLimit: d.images },
        });
        out.push({ plan: d.plan, product_id: product.id, price_id: price.id, amount_usd: d.amount });
        console.log(`created ${d.name}: product=${product.id} price=${price.id}`);
    }
    console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
    console.error("FAILED:", e.message);
    process.exit(1);
});
