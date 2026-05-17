import { CONTACT_CALENDAR_URL } from '../consts';
import { buildUrl, withBasePath } from './helpers';

export type ContactIntentParams = Record<
  string,
  string | number | boolean | undefined
>;

export const buildContactHqHref = (params: ContactIntentParams = {}) =>
  buildUrl(withBasePath('contact-hq/'), params);

export const getContactCalendarHref = () =>
  CONTACT_CALENDAR_URL ||
  buildContactHqHref({ brief: 'Schedule a planning call' });
