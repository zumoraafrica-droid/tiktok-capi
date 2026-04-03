const crypto = require("crypto");

function hashSHA256(value) {
  if (!value) return null;
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const order = req.body;
    const eventTime = Math.floor(Date.now() / 1000);

    const payload = {
      event_source: "web",
      event_source_id: process.env.TIKTOK_PIXEL_ID,
      data: [
        {
          event: "CompletePayment",
          event_time: eventTime,
          event_id: `order_${order.id}`,
          user: {
            email: hashSHA256(order.email),
            phone: hashSHA256(order.phone),
          },
          properties: {
            currency: order.currency,
            value: parseFloat(order.total_price),
            order_id: String(order.id),
            content_type: "product",
            contents: order.line_items?.map((item) => ({
              content_id: String(item.product_id),
              content_name: item.name,
              quantity: item.quantity,
              price: parseFloat(item.price),
            })),
          },
          page: {
            url: `https://${order.source_name || "yourstore.com"}/checkout`,
          },
        },
      ],
    };

    const tiktokRes = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/event/track/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": process.env.TIKTOK_ACCESS_TOKEN,
        },
        body: JSON.stringify(payload),
      }
    );

    const tiktokData = await tiktokRes.json();
    console.log("TikTok response:", JSON.stringify(tiktokData));

    return res.status(200).json({ success: true, tiktok: tiktokData });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
