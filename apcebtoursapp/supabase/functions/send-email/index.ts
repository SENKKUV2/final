// Supabase Functions, with Deno, require imports from URLs.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { Resend } from 'https://esm.sh/resend@3.2.0';

// Initialize the Resend client with your API key.
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// The Deno `serve` function listens for incoming HTTP requests.
serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    },
  );

  try {
    // Expect `tourId` instead of `bookingId`
    const { tourId } = await req.json();

    if (!tourId) {
      return new Response(JSON.stringify({ error: 'Missing tourId in request body.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch all bookings for this tour with user email + tour title
    const { data: bookings, error: fetchError } = await supabaseClient
      .from('bookings')
      .select('id, tour_id, contact_email, profiles ( contact_email, full_name ), tours ( title )')
      .eq('tour_id', tourId);

    if (fetchError || !bookings?.length) {
      console.error('Error fetching bookings:', fetchError?.message);
      return new Response(JSON.stringify({ error: 'No bookings found for this tour.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Loop through each booking and send an email
    for (const booking of bookings) {
      const recipientEmail = booking.profiles?.contact_email || booking.contact_email;
      const tourTitle = booking.tours?.title;

      if (!recipientEmail) {
        console.warn(`No email found for booking ID ${booking.id}`);
        continue;
      }

      const sendResult = await resend.emails.send({
        from: 'APTours Cebu <onboarding@resend.dev>', // ✅ Use verified domain later
        to: [recipientEmail],
        subject: `Booking Cancellation Confirmed: ${tourTitle}`,
        html: `
          <p>Dear ${booking.profiles?.full_name || 'Customer'},</p>
          <p>This is to confirm that your booking for <b>${tourTitle}</b> has been cancelled.</p>
          <p>Tour ID: <b>#${booking.tour_id}</b></p>
          <p>If you have any questions, please contact our support team.</p>
          <p>Sincerely,</p>
          <p>The Tour Company Team</p>
        `,
      });

      if (sendResult.error) {
        console.error(`Error sending email for booking ${booking.id}:`, sendResult.error.message);
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Cancellation emails sent for all bookings under this tour.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error in Edge Function:', err.message);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
