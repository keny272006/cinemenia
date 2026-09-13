export default async function handler(req, res) {
  // Allow cross-origin requests (CORS)
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { amount, title, list } = req.body || {};
    
    // Environment variables
    const keyId = process.env.RAZORPAY_KEY_ID || "rzp_live_Tbb8qpq1Uclr7z";
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return res.status(500).json({
        error: "RAZORPAY_KEY_SECRET is not configured in Vercel environment variables."
      });
    }

    const payAmount = Math.max(1, parseFloat(amount) || 15);
    const amountInPaise = Math.round(payAmount * 100);
    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const movieTitle = (title || "Cinemenia Premier Access").substring(0, 30);

    // Create Official Razorpay Order for In-Page Modal
    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
        notes: {
          title: movieTitle,
          list: (list || "").substring(0, 30)
        }
      })
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      const errorMsg = orderData.error ? orderData.error.description : "Failed to initialize payment gateway.";
      return res.status(orderResponse.status).json({ error: errorMsg });
    }

    return res.status(200).json({
      order_id: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      key_id: keyId
    });

  } catch (err) {
    console.error("Razorpay API error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
