// app/index.tsx
import { Redirect } from 'expo-router';

// This component simply redirects to your welcome screen
export default function Index() {
  return <Redirect href="/welcome" />;
}