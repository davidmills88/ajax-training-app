import type { ConsentQuestionnaire } from "./types.js";

export const CONSENT_KIND = "account_privacy" as const;

export const CONSENT_COPY = {
  title: "Account & privacy",
  intro:
    "Ajax Training stores the profile you create here so we can program for you later. Health-data and SMS consent are not part of this step — those come when we add wearables and coaching texts.",
  terms:
    "By continuing you create an Ajax member account for this gym. We keep your answers on your tenant record, minimize what we store, and do not sell your data. You can ask the front desk to close the account.",
  laterNote: "Apple Health, Eight Sleep, Whoop, Garmin, and Gym Lead Machine SMS are planned after M0. We will ask again before any of those turn on.",
};

export function emptyConsentQuestionnaire(): ConsentQuestionnaire {
  return {
    isAdult: false,
    understandProfileStorage: false,
    acceptTerms: false,
    understandLaterConsents: false,
    hearAboutUs: "",
    notes: "",
  };
}

export function validateConsent(q: ConsentQuestionnaire): string[] {
  const errors: string[] = [];
  if (!q.isAdult) errors.push("You need to confirm you are 18 or older.");
  if (!q.understandProfileStorage) errors.push("Please confirm you understand we store your training profile.");
  if (!q.acceptTerms) errors.push("Please accept the account terms to continue.");
  if (!q.understandLaterConsents) {
    errors.push("Please confirm you understand health and SMS consent come later.");
  }
  return errors;
}
