export const businessServiceTypes = [
  'Managed IT services',
  'Cybersecurity',
  'Microsoft 365 administration',
  'Cloud consulting',
  'Backup and recovery',
  'Network support',
  'Digital systems consulting',
] as const;

export const businessAreaServed = [
  {
    '@type': 'City',
    name: 'Chicago',
    address: {
      '@type': 'PostalAddress',
      addressRegion: 'IL',
      addressCountry: 'US',
    },
  },
  {
    '@type': 'AdministrativeArea',
    name: 'Chicago metropolitan area',
  },
] as const;

export const businessAudience = [
  'Professional services firms',
  'Healthcare offices',
  'Light manufacturing companies',
  'Multi-site offices',
  'Owner-led businesses',
] as const;

export const businessOfferCatalog = {
  '@type': 'OfferCatalog',
  name: 'Olive Chicago service lines',
  itemListElement: businessServiceTypes.map(serviceType => ({
    '@type': 'Offer',
    itemOffered: {
      '@type': 'Service',
      name: serviceType,
      serviceType,
    },
  })),
};
