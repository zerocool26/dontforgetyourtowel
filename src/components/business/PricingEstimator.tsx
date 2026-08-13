import { useMemo, useState } from 'preact/hooks';

type Tier = {
  id: string;
  name: string;
  low: number;
  high: number;
};

type Props = {
  tiers: Tier[];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);

export default function PricingEstimator({ tiers }: Props) {
  const [users, setUsers] = useState(50);
  const [tierId, setTierId] = useState(tiers[1]?.id ?? tiers[0]?.id ?? '');

  const tier = useMemo(
    () => tiers.find(item => item.id === tierId) ?? tiers[0],
    [tierId, tiers]
  );

  const safeUsers = Math.min(
    500,
    Math.max(5, Number.isFinite(users) ? users : 5)
  );
  const low = tier ? safeUsers * tier.low : 0;
  const high = tier ? safeUsers * tier.high : 0;

  return (
    <div className="estimator" data-testid="pricing-estimator">
      <div className="estimator__controls">
        <label>
          <span>Users</span>
          <input
            type="number"
            min="5"
            max="500"
            step="1"
            value={users}
            onInput={event => setUsers(event.currentTarget.valueAsNumber)}
          />
        </label>
        <label>
          <span>Service level</span>
          <select
            value={tierId}
            onChange={event => setTierId(event.currentTarget.value)}
          >
            {tiers.map(item => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="estimator__result" aria-live="polite">
        <span>Directional monthly range</span>
        <strong>
          {formatCurrency(low)}–{formatCurrency(high)}
        </strong>
        <p>
          Based on {safeUsers} users at the {tier?.name ?? 'selected'} level.
          Final scope depends on devices, locations, coverage, security,
          recovery, and project needs.
        </p>
      </div>
    </div>
  );
}
