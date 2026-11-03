import type { ReactNode } from 'react'
import AgeBandChart from '../components/AgeBandChart.tsx'
import LoadError from '../components/LoadError.tsx'
import Loading from '../components/Loading.tsx'
import ScoreHistogram from '../components/ScoreHistogram.tsx'
import StatRow from '../components/StatRow.tsx'
import StatTile from '../components/StatTile.tsx'
import { DOMAINS } from '../domains.ts'
import { useEvaluation } from '../hooks/useEvaluation.ts'

function pct(rate: number) {
  return `${(rate * 100).toFixed(1)}%`
}

function ageLabel(band: string) {
  const match = band.match(/\[(\d+), (\d+)\)/)
  return match ? `${match[1]} to ${match[2]}` : band
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Table({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <div className="panel max-w-2xl overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[0])}>
              {row.map((cell, index) =>
                index === 0 ? (
                  <th key={index} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={index} className="tabular-nums">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ModelReport() {
  const { evaluation, errors, retry } = useEvaluation()

  if (errors.length > 0) return <LoadError errors={errors} onRetry={retry} />
  if (evaluation === null) return <Loading />

  const { test_set: test, overlap, score_distribution: scores, fold_consistency: folds } = evaluation
  const similar = scores.ks_p_value >= 0.05
  const ageRows = [...evaluation.by_age_band]
    .sort((a, b) => parseInt(a.age_band.slice(1)) - parseInt(b.age_band.slice(1)))
    .map((row) => ({ label: ageLabel(row.age_band), rows: row.rows, forest: row.if_flagged, rules: row.rule_flagged }))

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Model report</h1>
        <p className="text-sm text-slate-600">
          How the two screening methods behave on {test.rows} test records that were not used for training.
        </p>
      </div>

      <section className="rounded-lg border border-l-4 border-amber-300 border-l-amber-600 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <h2 className="font-semibold">Read this first</h2>
        <ul className="mt-1 list-disc pl-5">
          {evaluation.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <p className="mt-1">This report gives no accuracy, sensitivity or specificity, because there is nothing to measure them against.</p>
      </section>

      <StatRow columns={3}>
        <StatTile label="Test records" value={test.rows} testId="rows" />
        <StatTile label={`Isolation Forest flagged (${pct(test.isolation_forest.rate)})`} value={test.isolation_forest.flagged} testId="if-flagged" />
        <StatTile label={`Rule-based flagged (${pct(test.rule_based.rate)})`} value={test.rule_based.flagged} testId="rule-flagged" />
      </StatRow>

      <Section title="Where the methods agree">
        <Table
          columns={['Result', 'Records']}
          rows={[
            ['Flagged by both', overlap.both],
            ['Flagged by the rule-based check only', overlap.rule_based_only],
            ['Flagged by the Isolation Forest only', overlap.isolation_forest_only],
            ['Flagged by neither', overlap.neither],
          ]}
        />
        <p className="text-sm text-slate-600">
          The overlap between the two flagged groups is {overlap.jaccard.toFixed(2)} (1.00 would mean identical groups).
          The rule-based check flags more records because any single domain more than 2 standard deviations below the
          group is enough, while the Isolation Forest is set to flag about {pct(evaluation.settings.contamination)} of
          records.
        </p>
      </Section>

      <Section title="Isolation Forest scores">
        <p className="text-sm text-slate-600">
          Each test record gets a score. Records with a score below {scores.flag_threshold} are flagged: the bars left
          of the dashed line.
        </p>
        <div className="panel p-4">
          <ScoreHistogram
            edges={scores.test_histogram.edges}
            counts={scores.test_histogram.counts}
            threshold={scores.flag_threshold}
          />
        </div>
        <Table
          columns={['Scores', 'Mean', 'Spread (std)', 'Lowest', 'Median', 'Highest']}
          rows={(['train', 'test'] as const).map((name) => [
            name === 'train' ? 'Training records' : 'Test records',
            scores[name].mean,
            scores[name].std,
            scores[name].min,
            scores[name].median,
            scores[name].max,
          ])}
        />
        <p className="text-sm text-slate-600" data-testid="ks">
          {similar
            ? `Training and test scores have a similar spread (KS statistic ${scores.ks_statistic}, p = ${scores.ks_p_value}), so the test records are not scored differently from the training records.`
            : `Training and test scores differ (KS statistic ${scores.ks_statistic}, p = ${scores.ks_p_value}), so results on new records may behave differently from the training data.`}
        </p>
      </Section>

      <Section title="Flags by age group">
        <p className="text-sm text-slate-600">Test records flagged by each method in each age group (months).</p>
        <div className="panel p-4">
          <AgeBandChart data={ageRows} />
        </div>
      </Section>

      <Section title="Rule-based flags by domain">
        <Table
          columns={['Domain', 'Test records flagged']}
          rows={DOMAINS.map(({ key, label }) => [label, evaluation.rule_flags_by_domain[key]])}
        />
        <p className="text-sm text-slate-600">A record can be flagged in more than one domain.</p>
      </Section>

      <Section title="Stability">
        <p className="text-sm text-slate-600">
          The models were trained again on {folds.isolation_forest.flag_rate_per_fold.length} different parts of the
          data. Overlap compares the records flagged by each pair of runs (1.00 means the same records every time).
        </p>
        <Table
          columns={['Method', 'Mean overlap', 'Lowest overlap', 'Flagged in any run', 'Flagged in every run']}
          rows={[
            ['Isolation Forest', folds.isolation_forest.mean_agreement, folds.isolation_forest.lowest_agreement, folds.isolation_forest.flagged_in_any_fold, folds.isolation_forest.flagged_in_all_folds],
            ['Rule-based', folds.rule_based.mean_agreement, folds.rule_based.lowest_agreement, folds.rule_based.flagged_in_any_fold, folds.rule_based.flagged_in_all_folds],
          ]}
        />
      </Section>

      <Section title="Settings">
        <p className="text-sm text-slate-600">
          Isolation Forest with {evaluation.settings.n_estimators} trees, expected flag share{' '}
          {pct(evaluation.settings.contamination)}, using the four domain z-scores: {evaluation.settings.features.join(', ')}.
        </p>
      </Section>
    </div>
  )
}