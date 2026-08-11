import React, { useMemo, useState } from 'react';
import { OnboardingKind, OnboardingResult, OrgRoleId, RegistrySide } from './types';
import { ORG_ROLES, DEMO_HOSPITAL, rolesForSide } from './demoOrg';
import { useOrgTree } from './useOrgTree';

/*
  ONBOARDING WIZARD — shown once, right after a wallet is connected (or in demo mode), BEFORE the
  dashboard. Letters only, brand theme. Steps:

    1. KIND     Citizen (family) OR Hospital faculty
    2. SIDE     (faculty) Births OR Deaths
    3. ROLE     (faculty) pick a role for that side
    4. PLACE    (faculty) confirm hospital + choose your senior; if the senior isn't listed, type
                the name and "Add ‘<name>’ to the list" creates them under the chosen role's flow.

  DEMO NOTE (always-on, per user): any wallet can pick any role — there is no invite/ZK gate yet.
  A visible "DEMO" ribbon marks this so it's obvious which screens become gated in the secure build.
  The wizard hands an OnboardingResult back to the app to open the matching dashboard.
*/

interface OnboardingWizardProps {
  accountId: string | null;
  onComplete: (result: OnboardingResult) => void;
}

type Step = 'KIND' | 'SIDE' | 'ROLE' | 'PLACE';

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ accountId, onComplete }) => {
  const org = useOrgTree();

  const [step, setStep] = useState<Step>('KIND');
  const [kind, setKind] = useState<OnboardingKind | null>(null);
  const [side, setSide] = useState<RegistrySide | null>(null);
  const [roleId, setRoleId] = useState<OrgRoleId | null>(null);

  // "Choose your senior" state.
  const [seniorId, setSeniorId] = useState<string | null>(null);
  const [seniorQuery, setSeniorQuery] = useState('');

  const roleMeta = roleId ? ORG_ROLES[roleId] : null;

  const seniorCandidates = useMemo(() => {
    if (!roleId) return [];
    const all = org.seniorsForRole(roleId);
    const q = seniorQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter((n) => n.name.toLowerCase().includes(q));
  }, [org, roleId, seniorQuery]);

  // Whether the typed query already matches an existing senior (so we don't offer to add a dup).
  const queryMatchesExisting = useMemo(() => {
    const q = seniorQuery.trim().toLowerCase();
    return q.length > 0 && seniorCandidates.some((n) => n.name.toLowerCase() === q);
  }, [seniorQuery, seniorCandidates]);

  const chooseKind = (k: OnboardingKind) => {
    setKind(k);
    if (k === 'CITIZEN') {
      onComplete({ kind: 'CITIZEN' });
      return;
    }
    setStep('SIDE');
  };

  const chooseSide = (s: RegistrySide) => {
    setSide(s);
    setRoleId(null);
    setStep('ROLE');
  };

  const chooseRole = (r: OrgRoleId) => {
    setRoleId(r);
    setSeniorId(null);
    setSeniorQuery('');
    setStep('PLACE');
  };

  const addTypedSenior = () => {
    if (!roleId || !seniorQuery.trim()) return;
    // In demo, a newly-added senior is placed under the hospital admin as a reasonable default.
    const created = org.addNode(seniorQuery.trim(), roleId, DEMO_HOSPITAL.adminNodeId);
    setSeniorId(created.id);
    setSeniorQuery(created.name);
  };

  const finishFaculty = () => {
    if (!side || !roleId || !seniorId) return;
    // Create the acting node for THIS user, under the chosen senior, bound to their wallet.
    const me = org.addNode(
      accountId ? `You (${accountId})` : 'You',
      roleId,
      seniorId,
      accountId
    );
    onComplete({
      kind: 'FACULTY',
      side,
      roleId,
      hospitalId: DEMO_HOSPITAL.id,
      nodeId: me.id,
    });
  };

  return (
    <div className="min-h-screen bg-[#28292e] text-white font-sans flex flex-col">
      {/* DEMO ribbon — honest labelling of the unrestricted demo path. */}
      <div className="bg-brand-500/15 border-b border-brand-500/30 text-brand-200 text-[11px] font-semibold tracking-wide uppercase text-center py-1.5">
        Demo — roles are unrestricted for testing
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          {/* Wordmark */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              BIDECEL <span className="text-brand-400">Ledger</span>
            </h1>
            <p className="text-sm text-slate-400 mt-2">Let’s get you to the right place.</p>
          </div>

          <div className="bg-[#232429] border border-slate-700/70 rounded-2xl shadow-2xl p-7">
            {/* Step: KIND */}
            {step === 'KIND' && (
              <StepShell
                title="How are you using BIDECEL?"
                subtitle="Choose the option that describes you."
              >
                <div className="grid grid-cols-1 gap-3">
                  <ChoiceButton
                    title="I’m a citizen / family member"
                    body="I just want to verify a person’s birth or death record."
                    onClick={() => chooseKind('CITIZEN')}
                  />
                  <ChoiceButton
                    title="I’m hospital faculty / staff"
                    body="I work at a facility and need my role’s dashboard."
                    onClick={() => chooseKind('FACULTY')}
                  />
                </div>
              </StepShell>
            )}

            {/* Step: SIDE */}
            {step === 'SIDE' && (
              <StepShell
                title="Which registry do you work on?"
                subtitle="Civil registration is split into two sides."
                onBack={() => setStep('KIND')}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ChoiceButton
                    title="Births"
                    body="Civil Registration — Births"
                    onClick={() => chooseSide('BIRTHS')}
                  />
                  <ChoiceButton
                    title="Deaths"
                    body="Civil Registration — Deaths"
                    onClick={() => chooseSide('DEATHS')}
                  />
                </div>
              </StepShell>
            )}

            {/* Step: ROLE */}
            {step === 'ROLE' && side && (
              <StepShell
                title="What is your role?"
                subtitle={`Roles on the ${side === 'BIRTHS' ? 'Births' : 'Deaths'} side.`}
                onBack={() => setStep('SIDE')}
              >
                <div className="grid grid-cols-1 gap-3">
                  {rolesForSide(side).map((r) => (
                    <ChoiceButton
                      key={r.id}
                      title={r.label}
                      body={r.blurb}
                      onClick={() => chooseRole(r.id)}
                    />
                  ))}
                </div>
              </StepShell>
            )}

            {/* Step: PLACE (hospital + senior) */}
            {step === 'PLACE' && roleMeta && (
              <StepShell
                title="Your facility & senior"
                subtitle={`${DEMO_HOSPITAL.name} · ${DEMO_HOSPITAL.location}`}
                onBack={() => setStep('ROLE')}
              >
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  You’re joining as <span className="text-slate-200 font-semibold">{roleMeta.label}</span>.
                  Choose the senior you report to. If they’re not listed, type their name and add them.
                </p>

                <label className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                  Search your senior
                </label>
                <input
                  value={seniorQuery}
                  onChange={(e) => {
                    setSeniorQuery(e.target.value);
                    setSeniorId(null);
                  }}
                  placeholder="e.g. Dr Samuel"
                  className="w-full rounded-lg bg-[#1f2024] border border-slate-700 px-3 py-2.5 text-sm
                             focus:outline-none focus:border-brand-500"
                />

                {/* Candidate list */}
                <div className="mt-2 max-h-52 overflow-auto rounded-lg border border-slate-800 divide-y divide-slate-800">
                  {seniorCandidates.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        setSeniorId(n.id);
                        setSeniorQuery(n.name);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                        seniorId === n.id
                          ? 'bg-brand-600/20 text-white'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="font-medium">{n.name}</span>
                      <span className="block text-[11px] text-slate-500">
                        {ORG_ROLES[n.roleId].label}
                        {n.source === 'SESSION' ? ' · added now' : ''}
                      </span>
                    </button>
                  ))}

                  {/* "Add ‘<name>’ to the list" when the typed name isn't an existing senior. */}
                  {seniorQuery.trim() && !queryMatchesExisting && (
                    <button
                      onClick={addTypedSenior}
                      className="w-full text-left px-3 py-2.5 text-sm text-brand-300 hover:bg-slate-800 transition-colors"
                    >
                      + Add “{seniorQuery.trim()}” to the list
                    </button>
                  )}

                  {seniorCandidates.length === 0 && !seniorQuery.trim() && (
                    <div className="px-3 py-3 text-[11px] text-slate-500">
                      Start typing to find or add your senior.
                    </div>
                  )}
                </div>

                <button
                  disabled={!seniorId}
                  onClick={finishFaculty}
                  className="mt-5 w-full rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50
                             disabled:cursor-not-allowed text-white font-semibold py-3 transition-colors"
                >
                  Continue to dashboard
                </button>
              </StepShell>
            )}
          </div>

          <p className="text-center text-[11px] text-slate-600 mt-5">
            {accountId ? <>Signed in as <span className="font-mono">{accountId}</span></> : 'NEAR testnet'}
          </p>
        </div>
      </div>
    </div>
  );
};

/* ---------- small presentational helpers (letters only) ---------- */

const StepShell: React.FC<{
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, onBack, children }) => (
  <div>
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {onBack && (
        <button
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-brand-500 rounded-lg px-2.5 py-1 transition-colors shrink-0"
        >
          Back
        </button>
      )}
    </div>
    {children}
  </div>
);

const ChoiceButton: React.FC<{ title: string; body: string; onClick: () => void }> = ({
  title,
  body,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="text-left rounded-xl border border-slate-700 bg-[#1f2024] hover:border-brand-500
               hover:bg-slate-800/60 p-4 transition-colors"
  >
    <div className="font-semibold text-sm">{title}</div>
    <div className="text-xs text-slate-400 mt-1 leading-relaxed">{body}</div>
  </button>
);
