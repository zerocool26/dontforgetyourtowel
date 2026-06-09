export type ProviderSelectionSignal = {
  id: string;
  label: string;
  question: string;
  proof: string;
};

export type ProviderSelectionOutcome = {
  label: string;
  value: string;
};

export const providerSelectionSignals: ProviderSelectionSignal[] = [
  {
    id: 'ownership',
    label: 'Ownership',
    question:
      'Who owns the issue when apps, internet, devices, and vendors overlap?',
    proof: 'Named escalation owner, vendor map, open-ticket aging.',
  },
  {
    id: 'recovery',
    label: 'Recovery',
    question:
      'What restores first after an outage, failed server, or ransomware event?',
    proof: 'Protected systems, restore access, recovery order, incident roles.',
  },
  {
    id: 'identity',
    label: 'Identity',
    question:
      'Who can change access, bypass MFA, invite guests, or hold admin rights?',
    proof: 'Admin review, guest access notes, MFA exceptions, approval path.',
  },
  {
    id: 'microsoft-365',
    label: 'Microsoft 365',
    question:
      'Who governs Teams, SharePoint, OneDrive, licenses, and external sharing?',
    proof: 'Tenant notes, workspace owners, license review, cleanup plan.',
  },
  {
    id: 'recurring-drag',
    label: 'Repeat Issues',
    question:
      'Which recurring tickets should disappear instead of only getting answered?',
    proof:
      'Root-cause grouping, endpoint standards, 30/60/90 improvement list.',
  },
  {
    id: 'scope-truth',
    label: 'Scope Truth',
    question: 'What is included monthly, and what becomes project work?',
    proof: 'Scope boundaries, budget notes, approval owner, next decision.',
  },
];

export const providerSelectionOutcomes: ProviderSelectionOutcome[] = [
  {
    label: 'Before contract',
    value: 'Know what is owned.',
  },
  {
    label: 'Before onboarding',
    value: 'Know what is risky.',
  },
  {
    label: 'Before spending',
    value: 'Know the next decision.',
  },
];
