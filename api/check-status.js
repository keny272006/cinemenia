export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Missing transaction ID." });
  }

  const keyId = process.env.RAZORPAY_KEY_ID || "rzp_live_Tbb8qpq1Uclr7z";
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    return res.status(500).json({ error: "Server secret not configured." });
  }

  const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  try {
    const endpoint = id.startsWith("plink_")
      ? `https://api.razorpay.com/v1/payment_links/${id}`
      : `https://api.razorpay.com/v1/orders/${id}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error ? data.error.description : "Failed to verify status." });
    }

    const isPaid = data.status === "paid" || (data.amount_paid && data.amount_paid > 0);

    return res.status(200).json({
      paid: Boolean(isPaid),
      status: data.status,
      amount_paid: data.amount_paid
    });

  } catch (err) {
    console.error("Status check error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
