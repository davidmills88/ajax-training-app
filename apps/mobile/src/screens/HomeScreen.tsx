import type { MePayload } from "@ajax/shared";
import { Banner, Body, Button, Kicker, Muted, Screen, Title } from "../ui";

export function HomeScreen({ me, onSignOut }: { me: MePayload; onSignOut: () => void }) {
  const name = me.onboarding?.clientSummary?.name || me.user.fullName;

  return (
    <Screen footer={<Button label="Sign out" variant="ghost" onPress={onSignOut} />}>
      <Kicker>Ajax Training · M0</Kicker>
      <Title>You are in, {name}.</Title>
      <Body>
        Onboarding is complete. Your client summary is saved on the Ajax tenant. The first automated block is the next
        milestone — this build does not invent programming.
      </Body>
      <Banner>Coming later: session logging, wearables (Apple Health + Eight Sleep first), Grok overlay, GLM SMS.</Banner>
      <Muted>Signed in as {me.user.email}</Muted>
      <Muted>Tenant {me.user.tenantId}</Muted>
      {me.onboarding?.clientSummary?.goals ? <Muted>Goals: {me.onboarding.clientSummary.goals}</Muted> : null}
    </Screen>
  );
}
