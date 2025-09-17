// Supabase Functions, with Deno, require imports from URLs.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { Resend } from 'https://esm.sh/resend@3.2.0';

// Initialize the Resend client with your API key.
// The key is stored as a Supabase Secret.
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// The Deno `serve` function listens for incoming HTTP requests.
serve(async (req) => {
  // Check for the correct HTTP method.
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Get the Supabase anon key from the environment variables.
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
    // Parse the JSON body from the request.
    const { bookingId } = await req.json();

    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'Missing bookingId in request body.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the booking details, including the user's email and the tour title.
    const { data: booking, error: fetchError } = await supabaseClient
      .from('bookings')
      .select('*, profiles ( contact_email, full_name ), tours ( title )')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      console.error('Error fetching booking details:', fetchError?.message);
      return new Response(JSON.stringify({ error: 'Booking not found or failed to fetch details.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const recipientEmail = booking.profiles?.contact_email || booking.contact_email;
    const tourTitle = booking.tours?.title;

    if (!recipientEmail) {
      console.warn(`No email found for booking ID ${bookingId}.`);
      return new Response(JSON.stringify({ message: 'Booking found, but no recipient email available.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use Resend to send the email.
    const sendResult = await resend.emails.send({
      from: 'Tour Company <onboarding@resend.dev>', // Use a verified domain or "onboarding@resend.dev"
      to: [recipientEmail],
      subject: `Booking Cancellation Confirmed: ${tourTitle}`,
      html: `
        <p>Dear ${booking.profiles?.full_name || 'Customer'},</p>
        <p>This is to confirm that your request to cancel the booking for **${tourTitle}** has been approved.</p>
        <p>Your booking with ID **#${bookingId}** has been successfully cancelled.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p>Sincerely,</p>
        <p>The Tour Company Team</p>
      `,
    });

    // Check the result from Resend.
    if (sendResult.error) {
      console.error('Error sending email via Resend:', sendResult.error.message);
      return new Response(JSON.stringify({ error: 'Failed to send cancellation email.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return a success response.
    return new Response(JSON.stringify({ success: true, message: 'Cancellation email sent successfully.' }), {
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