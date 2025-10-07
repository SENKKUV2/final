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

    switch (status) {
      case "approved":
        subject = "Booking Approved ✅";
        body = `
          <h1>Your Booking Has Been Approved</h1>
          <p>Hi ${userName},</p>
          <p>Great news! Your booking for <strong>${tourTitle}</strong> has been approved.</p>
          <p>Tour ID: ${booking.tour_id}</p>
          <p>We're looking forward to having you join us! You'll receive a confirmation email with further details soon.</p>
        `;
        break;
      case "confirmed":
        subject = "Booking Confirmed 🎉";
        body = `
          <h1>Your Booking is Confirmed</h1>
          <p>Hi ${userName},</p>
          <p>Your booking for <strong>${tourTitle}</strong> has been confirmed.</p>
          <p>Tour ID: ${booking.tour_id}</p>
          <p>We’re excited to have you join us!</p>
        `;
        break;
      case "completed":
        subject = "Booking Completed ✅";
        body = `
          <h1>Thank You for Joining!</h1>
          <p>Hi ${userName},</p>
          <p>Your booking for <strong>${tourTitle}</strong> has been marked as completed.</p>
          <p>We hope you had a great experience and look forward to seeing you again!</p>
        `;
        break;
      case "cancelled":
        subject = "Booking Cancelled";
        body = `
          <h1>Your Booking Has Been Cancelled</h1>
          <p>Hi ${userName},</p>
          <p>We're sorry to inform you that your booking for <strong>${tourTitle}</strong> has been cancelled.</p>
          <p>Tour ID: ${booking.tour_id}</p>
          <p>If you have any questions or would like to book another tour, please contact our support team.</p>
        `;
        break;
      default:
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