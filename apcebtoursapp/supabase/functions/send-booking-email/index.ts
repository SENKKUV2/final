import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    const { bookingId, status } = await req.json();

    if (!bookingId || !status) {
      throw new Error("Missing bookingId or status");
    }

    const supabase = createClient(
      Deno.env.get("DB_URL")!,
      Deno.env.get("DB_ANON_KEY")!
    );

    // Fetch booking with profile + tour info
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(`
        *,
        profiles ( full_name, first_name, last_name, email ),
        tours ( title )
      `)
      .eq("id", bookingId)
      .single();

    if (error) throw new Error(`Failed to fetch booking: ${error.message}`);

    const userEmail =
      booking.contact_email || booking.profiles?.email;
    const userName =
      booking.profiles?.full_name ||
      `${booking.profiles?.first_name || ""} ${booking.profiles?.last_name || ""}`.trim() ||
      "Traveler";
    const tourTitle = booking.tours?.title || "your tour";

    if (!userEmail) throw new Error("No email address found for this booking");

    // Pick email subject & message based on status
    let subject = "";
    let body = "";

    if (status === "confirmed") {
      subject = "Booking Confirmed 🎉";
      body = `
        <h1>Your Booking is Confirmed</h1>
        <p>Hi ${userName},</p>
        <p>Your booking for <strong>${tourTitle}</strong> has been confirmed.</p>
        <p>Tour ID: ${booking.tour_id}</p>
        <p>We’re excited to have you join us!</p>
      `;
    } else if (status === "completed") {
      subject = "Booking Completed ✅";
      body = `
        <h1>Thank You for Joining!</h1>
        <p>Hi ${userName},</p>
        <p>Your booking for <strong>${tourTitle}</strong> has been marked as completed.</p>
        <p>We hope you had a great experience and look forward to seeing you again!</p>
      `;
    } else {
      throw new Error(`Unsupported status: ${status}`);
    }

    // Send email
    const resend = new Resend(Deno.env.get("EMAIL_API_KEY"));
    const { error: emailError } = await resend.emails.send({
      from: "APTours Cebu <onboarding@resend.dev>",
      to: [userEmail],
      subject,
      html: body,
    });

    if (emailError) throw new Error(`Failed to send email: ${emailError.message}`);

    return new Response(JSON.stringify({ message: "Email sent successfully" }), {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: corsHeaders,
      status: 400,
    });
  }
});
