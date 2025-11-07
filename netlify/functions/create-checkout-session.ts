import { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { priceId, userEmail, planId } = JSON.parse(event.body || "{}");

    if (!priceId || !userEmail) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY no configurada");

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          message: "Stripe no está configurado todavía. Por favor, configura STRIPE_SECRET_KEY en las variables de entorno de Netlify.",
          mockMode: true,
          url: `/dashboard?plan=${planId}&mock=true`,
        }),
      };
    }

    const stripe = require("stripe")(stripeSecretKey);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${event.headers.origin || "http://localhost:8888"}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${event.headers.origin || "http://localhost:8888"}/pricing`,
      customer_email: userEmail,
      metadata: {
        planId,
        userEmail,
      },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        url: session.url,
        sessionId: session.id,
      }),
    };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

export { handler };
