import { useState, useEffect } from 'react';
import { Send, FileText, Video, Presentation, Loader2, CheckCircle, AlertCircle, Copy, Building2, Target, Info, ChevronUp, Moon, Sun, Sparkles, ExternalLink } from 'lucide-react';
import { apiClient, FormData as APIFormData, GenerateResponse } from './api/client';

type WorkflowType = 'netnew' | 'closedlost' | 'expansion' | 'followup' | 'engagement';

interface ProgressStep {
  id: number;
  name: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

// Progress step configurations for different workflows
const FULL_WORKFLOW_STEPS: ProgressStep[] = [
  { id: 1, name: 'Scraping website', status: 'pending' },
  { id: 2, name: 'Enriching with Salesforce data', status: 'pending' },
  { id: 3, name: 'Analyzing company data', status: 'pending' },
  { id: 4, name: 'Fact-checking', status: 'pending' },
  { id: 5, name: 'Generating content', status: 'pending' },
  { id: 6, name: 'Finalizing assets', status: 'pending' },
];

const FOLLOWUP_WORKFLOW_STEPS: ProgressStep[] = [
  { id: 1, name: 'Analyzing original message', status: 'pending' },
  { id: 2, name: 'Generating follow-up content', status: 'pending' },
  { id: 3, name: 'Finalizing output', status: 'pending' },
];

const ENGAGEMENT_WORKFLOW_STEPS: ProgressStep[] = [
  { id: 1, name: 'Analyzing client context', status: 'pending' },
  { id: 2, name: 'Fetching industry insights', status: 'pending' },
  { id: 3, name: 'Generating meeting agenda', status: 'pending' },
  { id: 4, name: 'Creating outreach message', status: 'pending' },
];

// Instructions configuration for each workflow
const WORKFLOW_INSTRUCTIONS = {
  netnew: {
    title: 'Net New Prospecting',
    description: 'Challenge business assumptions with personalized outreach.',
    howToUse: [
      'Enter the target company name and website URL',
      'Add LinkedIn URL for enhanced research (optional)',
      'Select industry or leave as Unknown for AI detection',
      'Specify a business challenge to address in outreach'
    ],
    outputs: [
      { name: 'Email Draft', description: 'Personalized outreach email with subject lines' },
      { name: 'Loom Script', description: 'Video script with timestamps and visuals' },
      { name: 'Slide 3 Content', description: 'Problem/Reality/Shift framework for presentations' },
      { name: 'Intelligence Brief', description: 'Company research and key insights' }
    ],
    color: 'blue'
  },
  closedlost: {
    title: 'Closed Lost Re-Engagement',
    description: 'Find the "Black Swan" trigger for re-engagement.',
    howToUse: [
      'Enter the company name from your CRM',
      'Add opportunity details and champion name',
      'Select the original loss reason',
      'Provide any new context or trigger events'
    ],
    outputs: [
      { name: 'Email Draft', description: 'Re-engagement email acknowledging past context' },
      { name: 'Loom Script', description: 'Video script focused on new value proposition' },
      { name: 'Slide 3 Content', description: 'Updated positioning based on new triggers' },
      { name: 'Intelligence Brief', description: 'Updated company research and changes' }
    ],
    color: 'orange'
  },
  expansion: {
    title: 'Client Expansion',
    description: 'Leverage existing relationships for new opportunities.',
    howToUse: [
      'Enter your existing client\'s information',
      'Add champion contact and previous project details',
      'Select current project type and health score',
      'Describe the expansion trigger or opportunity'
    ],
    outputs: [
      { name: 'Email Draft', description: 'Expansion proposal referencing past success' },
      { name: 'Loom Script', description: 'Video highlighting expansion opportunity' },
      { name: 'Slide 3 Content', description: 'Business case for expanded engagement' },
      { name: 'Intelligence Brief', description: 'Client history and expansion context' }
    ],
    color: 'green'
  },
  followup: {
    title: 'Follow-up Sequence',
    description: 'Create the next touchpoint in your outreach sequence.',
    howToUse: [
      'Enter prospect name and select your last touchpoint type',
      'Paste or summarize context from your last outreach',
      'Select which touchpoint number this will be',
      'Add any new context and choose your output type'
    ],
    outputs: [
      { name: 'Email Draft', description: 'Follow-up email maintaining thread context' },
      { name: 'Phone Script', description: 'Call script with talking points and objection handling' },
      { name: 'LinkedIn Message', description: 'Short-form message under 300 characters' }
    ],
    color: 'purple'
  },
  engagement: {
    title: 'Client Engagement',
    description: 'Prepare for FF check-ins or Executive Briefings with existing clients.',
    howToUse: [
      'Select engagement type: FF (Fulfillment & Follow-up) or EB (Executive Brief)',
      'Enter client name and project phase/status',
      'Add last touchpoint date and any recent wins or concerns',
      'Choose channel: Email, Slack, or In-Person meeting'
    ],
    outputs: [
      { name: 'Outreach Message', description: 'Email, Slack, or meeting invitation draft' },
      { name: 'Meeting Agenda', description: 'Structured agenda with purpose and time allocations' },
      { name: 'Industry Insights', description: 'Recent AI/automation trends relevant to their industry' }
    ],
    color: 'teal'
  }
};

// Challenge presets for Net New Prospecting
const CHALLENGE_PRESETS = [
  { id: 'budget', label: 'Budget Constraints', value: 'Limited budget for external resources' },
  { id: 'incumbent', label: 'Incumbent Competitor', value: 'Currently working with a competitor or considering alternatives' },
  { id: 'scaling', label: 'Scaling Pains', value: 'Struggling to scale operations efficiently' },
  { id: 'tech-debt', label: 'Technical Debt', value: 'Legacy systems and technical debt slowing growth' },
  { id: 'talent', label: 'Talent/Hiring', value: 'Difficulty hiring and retaining skilled Salesforce talent' },
  { id: 'digital-transform', label: 'Digital Transformation', value: 'Undergoing or planning digital transformation initiatives' },
  { id: 'other', label: 'Other', value: 'other' }
];

const INDUSTRY_OPTIONS = [
  'SaaS/High Tech',
  'Financial Services',
  'Consumer Goods',
  'Professional Services',
  'Manufacturing',
  'Healthcare',
  'E-commerce',
  'Restaurant Tech',
  'Unknown',
];

const ASOEDemo = () => {
  const [activeTab, setActiveTab] = useState<WorkflowType>('netnew');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [generateLoom, setGenerateLoom] = useState<boolean>(() => {
    return localStorage.getItem('asoe_generateLoom') !== 'false';
  });

  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>(FULL_WORKFLOW_STEPS);
  const [showInstructions, setShowInstructions] = useState(false);

  // Magic Link scraping state
  const [isScraping, setIsScraping] = useState(false);
  const [scrapePreview, setScrapePreview] = useState<{
    companyName: string;
    industry: string | null;
    scraped: boolean;
  } | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // Challenge presets state
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<APIFormData>({
    industry: 'SaaS/High Tech',
    lossReason: 'Price',
    projectType: 'EaaSe/Ongoing Support',
    tone: 'professional_curious'
  });
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Persist generateLoom preference
  useEffect(() => {
    localStorage.setItem('asoe_generateLoom', String(generateLoom));
  }, [generateLoom]);

  // Set default values when tab changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      industry: prev.industry || 'SaaS/High Tech',
      lossReason: prev.lossReason || 'Price',
      projectType: prev.projectType || 'EaaSe/Ongoing Support',
      tone: 'professional_curious'
    }));
  }, [activeTab]);

  const updateFormField = (field: keyof APIFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Magic Link lookup handler
  const handleMagicLinkLookup = async () => {
    const url = formData.website;
    if (!url) return;

    setIsScraping(true);
    setScrapeError(null);
    setScrapePreview(null);

    try {
      const result = await apiClient.scrapePreview(url);

      if (result.success) {
        setScrapePreview({
          companyName: result.companyName,
          industry: result.industry,
          scraped: true
        });

        // Auto-populate form fields
        updateFormField('targetCompany', result.companyName);
        if (result.industry) {
          updateFormField('industry', result.industry);
        }
      } else {
        setScrapeError(result.error || 'Failed to scrape website');
      }
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setScrapeError('Website took too long to respond. Try again or enter company details manually.');
      } else {
        setScrapeError(err.message || 'Failed to lookup company. Please enter details manually.');
      }
    } finally {
      setIsScraping(false);
    }
  };

  const copyToClipboard = async (text: string, sectionName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionName);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyEmailToClipboard = async (text: string, sectionName: string) => {
    try {
      // Split on paragraph breaks (\n\n) first, then convert single \n to <br> within each paragraph.
      // Using <p> tags (not a flat <br> list) is required for Gmail to preserve line breaks on send.
      const paragraphs = text.split('\n\n');
      const htmlBody = paragraphs
        .map(para => `<p style="margin: 0 0 12px 0;">${para.replace(/\n/g, '<br>')}</p>`)
        .join('');
      const html = `<div style="font-family: Verdana, Geneva, Tahoma, sans-serif; font-size: 14px; line-height: 1.6;">${htmlBody}</div>`;
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
      setCopiedSection(sectionName);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      // Fall back to plain text if ClipboardItem is unsupported
      await copyToClipboard(text, sectionName);
    }
  };

  function formatInputForCopy(): string {
    switch (activeTab) {
      case 'netnew':
        return [
          `Target Company: ${formData.targetCompany || ''}`,
          `Prospect Name: ${formData.prospectName || '(generic greeting)'}`,
          `Website: ${formData.website || ''}`,
          `LinkedIn: ${formData.linkedIn || ''}`,
          `Industry: ${formData.industry || ''}`,
          `Business Challenge: ${formData.businessChallenge || ''}`,
          `Additional Context: ${formData.additionalContext || ''}`
        ].join('\n');

      case 'closedlost':
        return [
          `Company: ${formData.companyName || ''}`,
          `Website: ${formData.website || ''}`,
          `Opportunity Name: ${formData.opportunityName || ''}`,
          `Champion Name: ${formData.champion || ''}`,
          `Loss Reason: ${formData.lossReason || 'Price'}`,
          `Loss Date: ${formData.lossDate || ''}`,
          `New Context/Black Swan: ${formData.newContext || ''}`
        ].join('\n');

      case 'expansion':
        return [
          `Client Name: ${formData.companyName || ''}`,
          `Website: ${formData.website || ''}`,
          `Champion Name: ${formData.contactName || ''}`,
          `Previous/Current Project: ${formData.previousProject || ''}`,
          `Project Type: ${formData.projectType || ''}`,
          `Health Score: ${formData.healthScore || ''}`,
          `New Expansion Trigger: ${formData.newTrigger || ''}`
        ].join('\n');

      case 'followup':
        return [
          `Prospect Name: ${formData.prospectName || ''}`,
          `Last Touchpoint Type: ${formData.lastTouchpointType || 'email'}`,
          `Last Touchpoint Context: ${formData.lastTouchpointContext || ''}`,
          `Touchpoint Number: ${formData.touchpointNumber || '2'}`,
          `Additional Context: ${formData.additionalContext || ''}`,
          `Output Type: ${formData.outputType || 'email'}`
        ].join('\n');

      case 'engagement':
        return [
          `Engagement Type: ${formData.engagementType === 'eb' ? 'Executive Brief' : 'Fulfillment & Follow-up'}`,
          `Client Name: ${formData.clientName || ''}`,
          `Website: ${formData.website || ''}`,
          `Client Tier: ${formData.clientTier || ''}`,
          `Industry: ${formData.industry || ''}`,
          `Project Phase: ${formData.projectPhase || ''}`,
          `Last Touchpoint: ${formData.lastTouchpointDate || ''}`,
          `Recent Wins: ${formData.recentWins || ''}`,
          `Upcoming Concerns: ${formData.upcomingConcerns || ''}`,
          `Channel: ${formData.channelType || ''}`
        ].join('\n');

      default:
        return '';
    }
  }

  const copyInput = () => {
    const inputText = formatInputForCopy();
    copyToClipboard(inputText, 'input');
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setShowResults(false);
    setError(null);
    setResults(null);

    // Set appropriate progress steps based on workflow type
    function getWorkflowSteps(workflow: WorkflowType): ProgressStep[] {
      switch (workflow) {
        case 'followup':
          return FOLLOWUP_WORKFLOW_STEPS;
        case 'engagement':
          return ENGAGEMENT_WORKFLOW_STEPS;
        default:
          return FULL_WORKFLOW_STEPS;
      }
    }
    const initialSteps = getWorkflowSteps(activeTab).map(s => ({ ...s, status: 'pending' as const }));

    setProgressSteps(initialSteps);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgressSteps(steps => {
          const currentStep = steps.findIndex(s => s.status === 'active');
          if (currentStep === -1) {
            return steps.map((s, idx) => idx === 0 ? { ...s, status: 'active' } : s);
          }
          if (currentStep < steps.length - 1) {
            return steps.map((s, idx) => {
              if (idx < currentStep) return { ...s, status: 'complete' };
              if (idx === currentStep) return { ...s, status: 'complete' };
              if (idx === currentStep + 1) return { ...s, status: 'active' };
              return s;
            });
          }
          return steps;
        });
      }, 5000); // Update every 5 seconds

      const response = await apiClient.generate({
        formData: { ...formData, includeLoom: generateLoom },
        workflowType: activeTab
      });

      clearInterval(progressInterval);

      // Mark all as complete
      setProgressSteps(steps => steps.map(s => ({ ...s, status: 'complete' })));

      setResults(response);
      setShowResults(true);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to generate assets');
      setProgressSteps(steps => steps.map(s =>
        s.status === 'active' ? { ...s, status: 'error' } : s
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  const renderInstructions = () => {
    const instructions = WORKFLOW_INSTRUCTIONS[activeTab];
    const colorClasses = {
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', heading: 'text-blue-900', bullet: 'text-blue-500', icon: 'text-blue-400 hover:text-blue-600' },
      orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', heading: 'text-orange-900', bullet: 'text-orange-500', icon: 'text-orange-400 hover:text-orange-600' },
      green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', heading: 'text-green-900', bullet: 'text-green-500', icon: 'text-green-400 hover:text-green-600' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', heading: 'text-purple-900', bullet: 'text-purple-500', icon: 'text-purple-400 hover:text-purple-600' },
      teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', heading: 'text-teal-900', bullet: 'text-teal-500', icon: 'text-teal-400 hover:text-teal-600' }
    };
    const colors = colorClasses[instructions.color as keyof typeof colorClasses];

    return (
      <div className={`${colors.bg} ${colors.border} border rounded-lg p-4`}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className={`text-lg font-bold ${colors.heading}`}>{instructions.title}</h3>
            <p className={`text-sm ${colors.text}`}>{instructions.description}</p>
          </div>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className={`p-2 rounded-full transition-colors ${colors.icon}`}
            title={showInstructions ? "Hide instructions" : "Show instructions"}
          >
            <Info className="h-6 w-6" />
          </button>
        </div>

        {/* Collapsible How to Use section */}
        {showInstructions && (
          <div className="mt-3 pt-3 border-t border-opacity-50" style={{ borderColor: 'currentColor' }}>
            <div className="mb-4">
              <h4 className={`text-sm font-semibold ${colors.heading} mb-2 flex items-center`}>
                How to Use
                <ChevronUp className="h-4 w-4 ml-1" />
              </h4>
              <ul className="space-y-1.5">
                {instructions.howToUse.map((step, idx) => (
                  <li key={idx} className="flex items-start text-sm">
                    <span className={`${colors.bullet} mr-2 font-bold`}>{idx + 1}.</span>
                    <span className={colors.text}>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className={`text-sm font-semibold ${colors.heading} mb-2`}>Generated Outputs</h4>
              <ul className="space-y-2">
                {instructions.outputs.map((output, idx) => (
                  <li key={idx} className="text-sm">
                    <span className={`font-medium ${colors.heading}`}>{output.name}</span>
                    <p className={`text-xs ${colors.text} mt-0.5`}>{output.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderForm = () => {
    if (activeTab === 'netnew') {
      return (
        <div className="space-y-4">
          {/* Magic Link Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website URL (Magic Link) *
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => {
                  updateFormField('website', e.target.value);
                  setScrapePreview(null);
                  setScrapeError(null);
                }}
                className="flex-1 px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="https://company.com"
              />
              <button
                type="button"
                onClick={handleMagicLinkLookup}
                disabled={isScraping || !formData.website}
                className={`px-4 py-2.5 rounded-md font-medium transition-colors ${
                  isScraping || !formData.website
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isScraping ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Lookup'
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Paste a website URL and click Lookup to auto-detect company name and industry
            </p>
          </div>

          {/* Scrape Error */}
          {scrapeError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-700">{scrapeError}</p>
              </div>
            </div>
          )}

          {/* Scrape Preview */}
          {scrapePreview?.scraped && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Company Detected</span>
              </div>
              <p className="text-sm text-blue-800">
                <strong>Name:</strong> {scrapePreview.companyName}
              </p>
              {scrapePreview.industry && (
                <p className="text-sm text-blue-800">
                  <strong>Industry:</strong> {scrapePreview.industry}
                </p>
              )}
              <p className="text-xs text-blue-600 mt-2">
                You can edit these values below if needed.
              </p>
            </div>
          )}

          {/* Company Name (editable, auto-filled) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name {scrapePreview?.scraped ? '(auto-detected)' : '*'}
            </label>
            <input
              type="text"
              value={formData.targetCompany || ''}
              onChange={(e) => updateFormField('targetCompany', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Acme Corp"
            />
          </div>

          {/* Name of Prospect (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name of Prospect <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.prospectName || ''}
              onChange={(e) => updateFormField('prospectName', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., John"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank to use generic greeting like "Hi there,"
            </p>
          </div>

          {/* LinkedIn URL (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company LinkedIn URL (optional)
            </label>
            <input
              type="url"
              value={formData.linkedIn || ''}
              onChange={(e) => updateFormField('linkedIn', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.linkedin.com/company/acmecorp"
            />
          </div>

          {/* Industry (auto-filled or selected) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry {scrapePreview?.industry ? '(auto-detected)' : '*'}
            </label>
            <select
              value={INDUSTRY_OPTIONS.includes(formData.industry ?? 'SaaS/High Tech') ? (formData.industry ?? 'SaaS/High Tech') : 'Other'}
              onChange={(e) => updateFormField('industry', e.target.value === 'Other' ? '' : e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {INDUSTRY_OPTIONS.map((opt) => <option key={opt}>{opt}</option>)}
              <option value="Other">Other</option>
            </select>
            {!INDUSTRY_OPTIONS.includes(formData.industry ?? 'SaaS/High Tech') && (
              <input
                type="text"
                value={formData.industry ?? ''}
                onChange={(e) => updateFormField('industry', e.target.value)}
                className="w-full mt-2 px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the industry..."
                autoFocus
              />
            )}
          </div>

          {/* Business Challenge Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Challenge to Address
            </label>

            {/* Challenge Chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {CHALLENGE_PRESETS.map((challenge) => (
                <button
                  key={challenge.id}
                  type="button"
                  onClick={() => {
                    setSelectedChallenge(challenge.id);
                    if (challenge.id !== 'other') {
                      updateFormField('businessChallenge', challenge.value);
                    } else {
                      updateFormField('businessChallenge', '');
                    }
                  }}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    selectedChallenge === challenge.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  {challenge.label}
                </button>
              ))}
            </div>

            {/* Custom Challenge Input (shown when "Other" is selected) */}
            {selectedChallenge === 'other' && (
              <input
                type="text"
                value={formData.businessChallenge || ''}
                onChange={(e) => updateFormField('businessChallenge', e.target.value)}
                className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the specific business challenge..."
              />
            )}

            {/* Show selected challenge value for non-other selections */}
            {selectedChallenge && selectedChallenge !== 'other' && (
              <p className="text-xs text-gray-500 mt-1 italic">
                "{formData.businessChallenge}"
              </p>
            )}
          </div>

          {/* Additional Context (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Context <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={formData.additionalContext || ''}
              onChange={(e) => updateFormField('additionalContext', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="e.g., Met them at Dreamforce, they mentioned struggling with CPQ. Their CTO just left. They use HubSpot alongside Salesforce..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Any insider knowledge about the company or prospect that should shape the outreach
            </p>
          </div>
        </div>
      );
    } else if (activeTab === 'closedlost') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input
              type="text"
              value={formData.companyName || ''}
              onChange={(e) => updateFormField('companyName', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Acme Corp"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Website (Optional)</label>
            <input
              type="url"
              value={formData.website || ''}
              onChange={(e) => updateFormField('website', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="https://company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Name *</label>
            <input
              type="text"
              value={formData.opportunityName || ''}
              onChange={(e) => updateFormField('opportunityName', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Q3 Digital Transformation"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Champion Name</label>
            <input
              type="text"
              value={formData.champion || ''}
              onChange={(e) => updateFormField('champion', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Sarah Johnson"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loss Reason *</label>
            <select
              value={formData.lossReason || 'Price'}
              onChange={(e) => updateFormField('lossReason', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option>Price</option>
              <option>No Decision / Non-Responsive</option>
              <option>Lost to Competitor</option>
              <option>Timing</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loss Date</label>
            <input
              type="date"
              value={formData.lossDate || ''}
              onChange={(e) => updateFormField('lossDate', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Context / Black Swan Trigger</label>
            <textarea
              value={formData.newContext || ''}
              onChange={(e) => updateFormField('newContext', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Series F funding, v0 launch, AI pivot, leadership change, new product launch..."
            />
          </div>
        </div>
      );
    } else if (activeTab === 'expansion') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
            <input
              type="text"
              value={formData.companyName || ''}
              onChange={(e) => updateFormField('companyName', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Acme Corp"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Website (Optional)</label>
            <input
              type="url"
              value={formData.website || ''}
              onChange={(e) => updateFormField('website', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="https://company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Champion Name</label>
            <input
              type="text"
              value={formData.contactName || ''}
              onChange={(e) => updateFormField('contactName', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Sarah Johnson"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Previous/Current Project *</label>
            <input
              type="text"
              value={formData.previousProject || ''}
              onChange={(e) => updateFormField('previousProject', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="EaaSe/Ongoing Support"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Type</label>
            <select
              value={formData.projectType || 'EaaSe/Ongoing Support'}
              onChange={(e) => updateFormField('projectType', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option>EaaSe/Ongoing Support</option>
              <option>Implementation</option>
              <option>Migration</option>
              <option>Custom Development</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Health Score</label>
            <select
              value={formData.healthScore || 'Green'}
              onChange={(e) => updateFormField('healthScore', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option>Green</option>
              <option>Yellow</option>
              <option>Red</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Expansion Trigger *</label>
            <textarea
              value={formData.newTrigger || ''}
              onChange={(e) => updateFormField('newTrigger', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Salesforce migration, new product launch, acquisition, new executive hire, expansion into new market..."
            />
          </div>
        </div>
      );
    } else if (activeTab === 'followup') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prospect Name *</label>
            <input
              type="text"
              value={formData.prospectName || ''}
              onChange={(e) => updateFormField('prospectName', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Sarah Johnson"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Touchpoint Type *</label>
            <select
              value={formData.lastTouchpointType || 'email'}
              onChange={(e) => updateFormField('lastTouchpointType', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Touchpoint Context *</label>
            <textarea
              value={formData.lastTouchpointContext || ''}
              onChange={(e) => updateFormField('lastTouchpointContext', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Paste or summarize your last outreach (email content, call notes, LinkedIn message)..."
              rows={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Touchpoint Number *</label>
            <select
              value={formData.touchpointNumber || '2'}
              onChange={(e) => updateFormField('touchpointNumber', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="2">2nd Touch (3-5 days after first)</option>
              <option value="3">3rd Touch (7-10 days after first)</option>
              <option value="4">4th Touch (14-21 days after first)</option>
              <option value="5">5th Touch (28+ days after first)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Context Notes</label>
            <textarea
              value={formData.additionalContext || ''}
              onChange={(e) => updateFormField('additionalContext', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Any new information or triggers since the last touch..."
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Output Type *</label>
            <select
              value={formData.outputType || 'email'}
              onChange={(e) => updateFormField('outputType', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="email">Email Draft</option>
              <option value="phone">Phone Call Script</option>
              <option value="linkedin">LinkedIn Message</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Website (Optional)
            </label>
            <input
              type="url"
              value={formData.followUpWebsite || ''}
              onChange={(e) => updateFormField('followUpWebsite', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              placeholder="https://company.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Add the prospect's company website to enrich the follow-up with company context
            </p>
          </div>
        </div>
      );
    } else if (activeTab === 'engagement') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Engagement Type *</label>
            <select
              value={formData.engagementType || 'ff'}
              onChange={(e) => updateFormField('engagementType', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
            >
              <option value="ff">FF - Fulfillment & Follow-up (Quarterly Check-in)</option>
              <option value="eb">EB - Executive Brief (Bi-Annual C-Suite Meeting)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
            <input
              type="text"
              value={formData.clientName || ''}
              onChange={(e) => updateFormField('clientName', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
              placeholder="Acme Corp"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Website URL</label>
            <input
              type="url"
              value={formData.website || ''}
              onChange={(e) => updateFormField('website', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
              placeholder="https://acmecorp.com (for company news & industry research)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Tier</label>
            <select
              value={formData.clientTier || 'target'}
              onChange={(e) => updateFormField('clientTier', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
            >
              <option value="strategic">Strategic ($500k+ annually)</option>
              <option value="target">Target (Ideal customer, long-term partner)</option>
              <option value="growth">Growth (Growing toward ICP)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <select
              value={formData.industry || 'SaaS/High Tech'}
              onChange={(e) => updateFormField('industry', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
            >
              <option>SaaS/High Tech</option>
              <option>Financial Services</option>
              <option>Consumer Goods</option>
              <option>Professional Services</option>
              <option>Manufacturing</option>
              <option>Unknown</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Phase / Status *</label>
            <select
              value={formData.projectPhase || 'ongoing'}
              onChange={(e) => updateFormField('projectPhase', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
            >
              <option value="analysis_design">Analysis & Design Complete</option>
              <option value="mid_build">Mid-Build</option>
              <option value="end_build">End of Build / Pre-Testing</option>
              <option value="go_live">Post Go-Live</option>
              <option value="ongoing">Ongoing Support (EaaSe)</option>
              <option value="project_complete">Project Complete / Renewal Discussion</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Touchpoint Date</label>
            <input
              type="date"
              value={formData.lastTouchpointDate || ''}
              onChange={(e) => updateFormField('lastTouchpointDate', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recent Wins / Accomplishments (raw notes)</label>
            <textarea
              value={formData.recentWins || ''}
              onChange={(e) => updateFormField('recentWins', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
              placeholder="Enter raw notes - these will be reformatted professionally. e.g., new workflow launched last week, team adoption up to 89%, saved about 3500 hours, positive feedback from Sarah's team..."
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topics to Address (raw notes)</label>
            <textarea
              value={formData.upcomingConcerns || ''}
              onChange={(e) => updateFormField('upcomingConcerns', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
              placeholder="Enter raw notes - these will guide the agenda naturally. e.g., budget review next month, they mentioned AI interest, new CTO started, want to discuss Phase 2..."
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Channel *</label>
            <select
              value={formData.channelType || 'email'}
              onChange={(e) => updateFormField('channelType', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
            >
              <option value="email">Email</option>
              <option value="slack">Slack Message</option>
              <option value="inperson">In-Person Meeting Invitation</option>
            </select>
          </div>
        </div>
      );
    }
    return null;
  };

  function getStepStatusClass(status: ProgressStep['status']): string {
    switch (status) {
      case 'complete':
        return 'text-gray-600';
      case 'active':
        return 'text-blue-600 font-semibold';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  }

  function getConfidenceLevelClass(level: string | undefined): string {
    switch (level) {
      case 'VERY_HIGH':
      case 'HIGH':
        return 'text-green-600';
      case 'MEDIUM':
        return 'text-yellow-600';
      default:
        return 'text-orange-600';
    }
  }

  function getInsightTypeStyle(insightType: string): { className: string; label: string } {
    switch (insightType) {
      case 'industry_specific':
        return { className: 'bg-blue-100 text-blue-700', label: 'Industry' };
      case 'salesforce':
        return { className: 'bg-purple-100 text-purple-700', label: 'Salesforce' };
      case 'ai_automation':
        return { className: 'bg-orange-100 text-orange-700', label: 'AI/Automation' };
      default:
        return { className: 'bg-gray-100 text-gray-700', label: 'General' };
    }
  }

  const renderProgressIndicator = () => {
    if (!isGenerating && !showResults) return null;

    return (
      <div className="glass-card gradient-border shadow-layered p-6 mb-6 relative overflow-hidden">
        {/* Scan line effect when generating */}
        {isGenerating && (
          <div className="scan-line absolute inset-0 pointer-events-none"></div>
        )}

        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className={`h-5 w-5 ${isGenerating ? 'text-neon-blue animate-pulse' : 'text-green-500'}`} />
          Generation Progress
        </h3>
        <div className="space-y-3">
          {progressSteps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center space-x-3 p-2 rounded-lg transition-all duration-300 ${
                step.status === 'active' ? 'bg-blue-50/80 shadow-sm' : ''
              }`}
            >
              {step.status === 'complete' && (
                <div className="progress-pulse">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                </div>
              )}
              {step.status === 'active' && (
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30"></div>
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0 relative z-10" />
                </div>
              )}
              {step.status === 'pending' && (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
              )}
              {step.status === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 animate-pulse" />
              )}
              <span className={`text-sm transition-all duration-300 ${
                getStepStatusClass(step.status)
              }`}>
                {step.name}
              </span>
            </div>
          ))}
        </div>
        {results && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Completed in <span className="font-semibold text-green-600">{results.processingTime}</span>
            </p>
            {/* Only show confidence for non-followup workflows */}
            {results.workflowType !== 'followup' && (
              <p className="text-xs text-gray-500 mt-1">
                Confidence: <span className={`font-semibold ${
                  getConfidenceLevelClass(results.metadata?.confidenceLevel)
                }`}>{results.metadata?.confidenceLevel || 'N/A'}</span>
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="space-y-6">
        {/* Company Intelligence Brief */}
        {results.intelligenceBrief && (
          <div className="glass-card gradient-border shadow-layered p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Building2 className="h-6 w-6 text-indigo-500" />
                <h3 className="text-lg font-semibold text-gray-900">Company Intelligence Brief</h3>
              </div>
              <button
                onClick={() => {
                  const brief = results.intelligenceBrief!;
                  const clean = (s: string) => s.replace(/[\t\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
                  const briefText = `Company Intelligence Brief\n\n` +
                    (brief.companySummary ? `What They Do:\n${clean(brief.companySummary)}\n\n` : '') +
                    (brief.businessModel ? `Business Model: ${clean(brief.businessModel)}\n\n` : '') +
                    (brief.servicesProducts?.length > 0 ? `Services/Products:\n${brief.servicesProducts.map(s => `- ${clean(s)}`).join('\n')}\n\n` : '') +
                    (brief.industry ? `Industry: ${clean(brief.industry)}\n\n` : '') +
                    `Data Sources: ${Object.entries(brief.pagesScraped).filter(([_, v]) => v).map(([k]) => k).join(', ')}`;
                  copyToClipboard(briefText.trim(), 'intelligence');
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
              >
                {copiedSection === 'intelligence' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              {/* What They Do */}
              {results.intelligenceBrief.companySummary && (
                <div className="flex items-start space-x-3">
                  <Target className="h-5 w-5 text-indigo-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">What They Do</p>
                    <p className="text-sm text-gray-700">{results.intelligenceBrief.companySummary}</p>
                  </div>
                </div>
              )}

              {/* Business Model */}
              {results.intelligenceBrief.businessModel && (
                <div className="flex items-start space-x-3">
                  <Building2 className="h-5 w-5 text-indigo-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Business Model</p>
                    <p className="text-sm text-gray-700">{results.intelligenceBrief.businessModel}</p>
                  </div>
                </div>
              )}

              {/* Services / Products */}
              {results.intelligenceBrief.servicesProducts?.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Services / Products</p>
                  <div className="flex flex-wrap gap-2">
                    {results.intelligenceBrief.servicesProducts.map((item, idx) => (
                      <span key={idx} className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Industry */}
              {results.intelligenceBrief.industry && (
                <div className="flex items-start space-x-3">
                  <Building2 className="h-5 w-5 text-indigo-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Industry</p>
                    <p className="text-sm text-gray-700">{results.intelligenceBrief.industry}</p>
                  </div>
                </div>
              )}

              {/* Data Sources */}
              <div className="bg-indigo-50 p-3 rounded border border-indigo-100">
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">Pages Scraped:</span>{' '}
                  {Object.entries(results.intelligenceBrief.pagesScraped)
                    .filter(([_, scraped]) => scraped)
                    .map(([page]) => page.charAt(0).toUpperCase() + page.slice(1))
                    .join(', ') || 'None'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Follow-up Output (for followup workflow) */}
        {results.workflowType === 'followup' && results.followUpOutput && (
          <div className="glass-card gradient-border shadow-layered p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Send className="h-6 w-6 text-purple-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {results.followUpOutput.outputType === 'email' && 'Follow-up Email Draft'}
                  {results.followUpOutput.outputType === 'phone' && 'Phone Call Script'}
                  {results.followUpOutput.outputType === 'linkedin' && 'LinkedIn Message'}
                </h3>
              </div>
              <button
                onClick={() => {
                  let text = '';
                  if (results.followUpOutput?.emailDraft) {
                    const body = results.followUpOutput.emailDraft.body;
                    text = results.followUpOutput.emailDraft.subject
                      ? `Subject: ${results.followUpOutput.emailDraft.subject}\n\n${body}`
                      : body;
                    copyEmailToClipboard(text, 'followup');
                    return;
                  } else if (results.followUpOutput?.phoneScript) {
                    text = `Opening: ${results.followUpOutput.phoneScript.opening}\n\nMain Points:\n${results.followUpOutput.phoneScript.mainPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nClosing: ${results.followUpOutput.phoneScript.closing}\n\nDuration: ${results.followUpOutput.phoneScript.duration}`;
                  } else if (results.followUpOutput?.linkedInMessage) {
                    text = results.followUpOutput.linkedInMessage.message;
                  }
                  copyToClipboard(text, 'followup');
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
              >
                {copiedSection === 'followup' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Email Draft Output */}
            {results.followUpOutput.emailDraft && (
              <div className="space-y-3">
                {results.followUpOutput.emailDraft.subject && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Alternative Subject Line <span className="text-gray-400 font-normal">(optional -- use if starting a new thread)</span>
                  </label>
                  <p className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                    {results.followUpOutput.emailDraft.subject}
                  </p>
                  {results.followUpOutput.emailDraft.subjectNote && (
                    <p className="text-xs text-gray-500 mt-1 italic">
                      {results.followUpOutput.emailDraft.subjectNote}
                    </p>
                  )}
                </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email Body</label>
                  <div className="text-sm text-gray-800 bg-gray-50 p-4 rounded border border-gray-200 whitespace-pre-wrap" style={{ fontFamily: 'Verdana, Geneva, Tahoma, sans-serif' }}>
                    {results.followUpOutput.emailDraft.body}
                  </div>
                </div>
              </div>
            )}

            {/* Phone Script Output */}
            {results.followUpOutput.phoneScript && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Opening</label>
                  <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded border border-gray-200">
                    {results.followUpOutput.phoneScript.opening}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Main Points</label>
                  <ul className="text-sm text-gray-800 bg-gray-50 p-4 rounded border border-gray-200 space-y-2">
                    {results.followUpOutput.phoneScript.mainPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="font-semibold mr-2">{idx + 1}.</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Closing</label>
                  <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded border border-gray-200">
                    {results.followUpOutput.phoneScript.closing}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded border border-purple-100">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Estimated Duration:</span> {results.followUpOutput.phoneScript.duration}
                  </p>
                </div>
              </div>
            )}

            {/* LinkedIn Message Output */}
            {results.followUpOutput.linkedInMessage && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">LinkedIn Message</label>
                  <div className="text-sm text-gray-800 bg-gray-50 p-4 rounded border border-gray-200 whitespace-pre-wrap" style={{ fontFamily: 'Verdana, Geneva, Tahoma, sans-serif' }}>
                    {results.followUpOutput.linkedInMessage.message}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded border border-purple-100">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Character Count:</span> {results.followUpOutput.linkedInMessage.characterCount} / 300
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Email Output (for non-followup workflows) */}
        {results.workflowType !== 'followup' && results.email && (
        <div className="glass-card gradient-border shadow-layered p-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Email Draft</h3>
            </div>
            <button
              onClick={() => {
                const emailText = `Subject: ${results.email?.subject}\n${results.email?.subjectAlt ? `Alt Subject: ${results.email.subjectAlt}\n` : ''}\n${results.email?.body}`;
                copyEmailToClipboard(emailText, 'email');
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            >
              {copiedSection === 'email' ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subject Line</label>
              <p className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                {results.email.subject}
              </p>
            </div>
            {results.email.subjectAlt && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Alt Subject</label>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                  {results.email.subjectAlt}
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email Body</label>
              <div className="text-sm text-gray-800 bg-gray-50 p-4 rounded border border-gray-200 whitespace-pre-wrap" style={{ fontFamily: 'Verdana, Geneva, Tahoma, sans-serif' }}>
                {results.email.body}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Loom Script (for non-followup workflows) */}
        {results.workflowType !== 'followup' && results.loomScript && (
        <div className="glass-card gradient-border shadow-layered p-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Video className="h-6 w-6 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900">Loom Script</h3>
            </div>
            <button
              onClick={() => {
                const loomText = `${results.loomScript?.title}\n\n${Object.entries(results.loomScript?.script || {})
                  .map(([phase, data]) => `${phase.toUpperCase()} (${data.timestamp})\n${data.visual}\n${data.content}`)
                  .join('\n\n')}`;
                copyToClipboard(loomText, 'loom');
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
            >
              {copiedSection === 'loom' ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Video Title</label>
              <p className="text-sm font-medium text-gray-900">{results.loomScript.title}</p>
            </div>
            {Object.entries(results.loomScript.script).map(([phase, data]) => (
              <div key={phase} className="border-l-4 border-purple-300 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-purple-600 uppercase">{phase}</span>
                  <span className="text-xs text-gray-500">{data.timestamp}</span>
                </div>
                <p className="text-xs text-gray-600 italic mb-2">{data.visual}</p>
                <p className="text-sm text-gray-800" style={{ fontFamily: 'Verdana, Geneva, Tahoma, sans-serif' }}>{data.content}</p>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Slide Content (for non-followup workflows) */}
        {results.workflowType !== 'followup' && results.slideContent && (
        <div className="glass-card gradient-border shadow-layered p-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Presentation className="h-6 w-6 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900">Slide 3 Content</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.open('https://drive.google.com/drive/folders/1BsxfmARvbvpVCLFHSdijM-d79PWgq8vv', '_blank')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span>New Deck</span>
              </button>
              <button
                onClick={() => {
                  const slideText = `${results.slideContent?.slideTitle}\n\nThe Problem\n${results.slideContent?.problem?.headline}\n\nThe Reality\n${results.slideContent?.reality?.bullets.join('\n')}\n\nThe Shift\n${results.slideContent?.shift?.from}  →  ${results.slideContent?.shift?.to}`;
                  copyToClipboard(slideText, 'slide');
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
              >
                {copiedSection === 'slide' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="space-y-5">
            {/* Slide Title */}
            <div className="border-b border-gray-200 pb-3">
              <h4 className="text-xl font-bold text-gray-900">{results.slideContent.slideTitle}</h4>
            </div>

            {/* The Problem */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <label className="block text-sm font-bold text-blue-900 mb-2">
                The Problem
              </label>
              <p className="text-sm text-gray-800 leading-relaxed" style={{ fontFamily: 'Verdana, Geneva, Tahoma, sans-serif' }}>
                {results.slideContent.problem?.headline}
              </p>
            </div>

            {/* The Reality */}
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <label className="block text-sm font-bold text-orange-900 mb-3">
                The Reality
              </label>
              <ul className="space-y-2">
                {results.slideContent.reality.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-orange-600 mr-2 mt-0.5">•</span>
                    <span className="text-sm text-gray-800" style={{ fontFamily: 'Verdana, Geneva, Tahoma, sans-serif' }}>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* The 2026 Shift */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <label className="block text-sm font-bold text-green-900 mb-3">
                The Shift
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">From:</p>
                    <p className="text-sm font-semibold text-gray-800">{results.slideContent.shift.from}</p>
                  </div>
                  <span className="text-gray-400 text-xl">→</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">To:</p>
                    <p className="text-sm font-semibold text-gray-800">{results.slideContent.shift.to}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-green-200">
                  <p className="text-sm font-medium text-green-900 italic">
                    {results.slideContent.shift.oneLiner}
                  </p>
                </div>
                {results.slideContent.shift.visualConcept && (
                  <div className="text-xs text-gray-600 pt-1">
                    <span className="font-semibold">Visual Concept:</span> {results.slideContent.shift.visualConcept}
                  </div>
                )}
              </div>
            </div>

            {/* Speaker Notes */}
            {results.slideContent.speakerNotes && (
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Speaker Notes</label>
                <p className="text-xs text-gray-600">{results.slideContent.speakerNotes}</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Client Engagement Output */}
        {results.workflowType === 'engagement' && results.engagementOutput && (
          <>
            {/* Outreach Message */}
            <div className="glass-card gradient-border shadow-layered p-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Send className="h-6 w-6 text-teal-500" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {results.engagementOutput.channelType === 'email' && 'Email Draft'}
                    {results.engagementOutput.channelType === 'slack' && 'Slack Message'}
                    {results.engagementOutput.channelType === 'inperson' && 'Meeting Invitation'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    const msg = results.engagementOutput!.outreachMessage;
                    const text = msg.subject ? `Subject: ${msg.subject}\n\n${msg.body}` : msg.body;
                    if (results.engagementOutput!.channelType === 'email') {
                      copyEmailToClipboard(text, 'outreach');
                    } else {
                      copyToClipboard(text, 'outreach');
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors"
                >
                  {copiedSection === 'outreach' ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="space-y-3">
                {results.engagementOutput.outreachMessage.subject && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Subject Line</label>
                    <p className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                      {results.engagementOutput.outreachMessage.subject}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Message Body</label>
                  <div className="text-sm text-gray-800 bg-gray-50 p-4 rounded border border-gray-200 whitespace-pre-wrap" style={{ fontFamily: 'Verdana, Geneva, Tahoma, sans-serif' }}>
                    {results.engagementOutput.outreachMessage.body}
                  </div>
                </div>
              </div>
            </div>

            {/* Meeting Agenda */}
            <div className="glass-card gradient-border shadow-layered p-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <FileText className="h-6 w-6 text-teal-500" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {results.engagementOutput.engagementType === 'eb' ? 'Executive Brief Agenda' : 'FF Meeting Agenda'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    const agenda = results.engagementOutput!.meetingAgenda;
                    const text = `${agenda.purpose}\n\nDuration: ${agenda.duration}\n\n` +
                      agenda.sections.map(s => `${s.title} (${s.timeAllocation})\n${s.bullets.map(b => `• ${b}`).join('\n')}`).join('\n\n');
                    copyToClipboard(text, 'agenda');
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors"
                >
                  {copiedSection === 'agenda' ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-teal-50 p-3 rounded border border-teal-200">
                  <p className="text-sm font-medium text-teal-900">{results.engagementOutput.meetingAgenda.purpose}</p>
                  <p className="text-xs text-teal-700 mt-1">Duration: {results.engagementOutput.meetingAgenda.duration}</p>
                </div>
                {results.engagementOutput.meetingAgenda.sections.map((section, idx) => (
                  <div key={idx} className="border-l-4 border-teal-300 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">{section.title}</span>
                      <span className="text-xs text-gray-500">{section.timeAllocation}</span>
                    </div>
                    <ul className="space-y-1">
                      {section.bullets.map((bullet, bidx) => (
                        <li key={bidx} className="flex items-start text-sm text-gray-700">
                          <span className="text-teal-500 mr-2">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Industry Insights (Slide-Deck Format) */}
            <div className="glass-card gradient-border shadow-layered p-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Presentation className="h-6 w-6 text-teal-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Industry Insights (for Slide Deck)</h3>
                </div>
                <button
                  onClick={() => {
                    const insights = results.engagementOutput!.industryInsights;
                    const text = insights.map(i =>
                      `HEADLINE: ${i.headline}\n\nKEY POINTS:\n${i.bullets.map(b => `• ${b}`).join('\n')}\n\nSOURCE: ${i.sourceName || 'N/A'}${i.sourceUrl ? `\nURL: ${i.sourceUrl}` : ''}`
                    ).join('\n\n---\n\n');
                    copyToClipboard(text, 'insights');
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors"
                >
                  {copiedSection === 'insights' ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">These insights are formatted for direct use in executive briefing slides</p>
              <div className="space-y-6">
                {results.engagementOutput.industryInsights.map((insight, idx) => (
                  <div key={idx} className="border-l-4 border-teal-400 bg-gray-50 p-4 rounded-r">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-base font-bold text-gray-900">{insight.headline}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        getInsightTypeStyle(insight.insightType).className
                      }`}>
                        {getInsightTypeStyle(insight.insightType).label}
                      </span>
                    </div>
                    <ul className="space-y-2 mb-3">
                      {insight.bullets.map((bullet, bidx) => (
                        <li key={bidx} className="flex items-start text-sm text-gray-700">
                          <span className="text-teal-500 mr-2 mt-0.5">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Source: {insight.sourceName || 'Industry Research'}</span>
                        {insight.sourceUrl && (
                          <a
                            href={insight.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-teal-600 hover:text-teal-800 hover:underline"
                          >
                            View Source →
                          </a>
                        )}
                      </div>
                      {(insight as any).verificationNote && (
                        <p className="text-xs text-gray-400 mt-1 italic">
                          To verify: {(insight as any).verificationNote}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                <strong>Note:</strong> These URLs link to relevant source sections. For exact article citations, verify by searching the provided terms. In production, these would be replaced with specific article URLs from live research.
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'bg-dark-bg' : 'bg-animated-gradient bg-grid-pattern'}`}>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="glass-card gradient-border shadow-layered-lg p-6 mb-6 relative overflow-hidden">
          {/* Shimmer overlay */}
          <div className="shimmer-effect absolute inset-0 pointer-events-none"></div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <img src="/SOLVDlogo.png" alt="SOLVD Logo" className="h-12 w-auto" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  ASOE: Automated Sales Outreach Engine
                </h1>
                <p className="text-gray-600">
                  AI-powered sales asset generation using Claude Sonnet 4 and SOLVD's "Expertise-as-a-Service" methodology
                </p>
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 rounded-full glass-card hover:scale-110 transition-all duration-300"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="h-6 w-6 text-yellow-400 animate-float" />
              ) : (
                <Moon className="h-6 w-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Workflow Tabs */}
        <div className="glass-card gradient-border shadow-layered mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('netnew')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-300 ${
                activeTab === 'netnew'
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/80'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Net New Prospecting
            </button>
            <button
              onClick={() => setActiveTab('closedlost')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-300 ${
                activeTab === 'closedlost'
                  ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50/80'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Closed Lost Re-Engagement
            </button>
            <button
              onClick={() => setActiveTab('expansion')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-300 ${
                activeTab === 'expansion'
                  ? 'border-b-2 border-green-500 text-green-600 bg-green-50/80'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Past Clients (Expansion)
            </button>
            <button
              onClick={() => setActiveTab('followup')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-300 ${
                activeTab === 'followup'
                  ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50/80'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Follow-up Sequence
            </button>
            <button
              onClick={() => setActiveTab('engagement')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-300 ${
                activeTab === 'engagement'
                  ? 'border-b-2 border-teal-500 text-teal-600 bg-teal-50/80'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Client Engagement
            </button>
          </div>

          <div className="p-6">
            {/* Instructions Panel - Compact at top */}
            <div className="mb-4">
              {renderInstructions()}
            </div>

            <div>
              {/* Form Panel */}
              {renderForm()}

              {/* Tone selector — applies to all workflows */}
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-500 mb-2">Tone</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { key: 'professional_curious', label: 'Professional & Curious' },
                    { key: 'consultative',         label: 'Consultative' },
                    { key: 'direct',               label: 'Direct' },
                    { key: 'executive',            label: 'Executive' },
                    { key: 'warm',                 label: 'Warm & Collegial' },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => updateFormField('tone', key)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                        (formData.tone || 'professional_curious') === key
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loom & Slides toggle — only for workflows that generate them */}
              {['netnew', 'closedlost', 'expansion'].includes(activeTab) && (
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => setGenerateLoom(prev => !prev)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      generateLoom ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        generateLoom ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Loom & Slides</span>
                    <span className="ml-1 text-gray-400">{generateLoom ? 'included' : 'off — email only'}</span>
                  </span>
                </div>
              )}

              {/* Generate button with Copy icon button */}
              <div className="mt-6 flex items-center gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
                    isGenerating
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'btn-gradient btn-liquid text-white shadow-neon-blue hover:shadow-lg hover:scale-[1.02]'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Generating Assets...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      <span>Generate Outreach Assets</span>
                    </>
                  )}
                </button>

                {/* Copy Input - Small icon button */}
                <button
                  type="button"
                  onClick={copyInput}
                  disabled={isGenerating}
                  className={`p-3 rounded-lg transition-colors border ${
                    isGenerating
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400'
                  }`}
                  title="Copy form input"
                >
                  {copiedSection === 'input' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-red-800">Error: {error}</span>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {renderProgressIndicator()}

        {/* Results */}
        {showResults && results && renderResults()}
      </div>
    </div>
  );
};

export default ASOEDemo;
