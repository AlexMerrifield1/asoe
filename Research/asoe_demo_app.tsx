import React, { useState } from 'react';
import { Send, FileText, Video, Presentation, CheckCircle, ArrowRight, Building2 } from 'lucide-react';

const ASOEDemo = () => {
  const [activeTab, setActiveTab] = useState('expansion');
  const [showResults, setShowResults] = useState(false);

  // Vercel-specific outputs based on your templates
  const vercelOutputs = {
    email: {
      subject: "Vercel Migration Strategy → Documentation & Knowledge Transfer",
      body: `Hi [Champion Name],

Over the past year, our EaaSe team has been embedded in your Salesforce operations—160 hours a month managing your CRM, integrations, and keeping your rev ops running smoothly while you scaled from startup chaos to enterprise infrastructure.

Now that you're planning the migration away from Salesforce and consolidating onto your own platform, I wanted to reach out about the next phase: **institutional knowledge transfer.**

Here's what we're seeing: The team that built your current Salesforce workflows isn't the team that will maintain your future automation stack. Without proper documentation of *why* things were built the way they were, you'll spend 6-12 months reverse-engineering your own systems during migration.

**The gap isn't technical—it's organizational memory.** Your Salesforce instance holds years of business logic, integration patterns, and automation decisions that live in ticket history and tribal knowledge. When you migrate, that context disappears unless it's systematically captured.

We've been working with other hypergrowth platforms (companies moving from third-party SaaS to in-house infrastructure) on what we call **Migration Intelligence**—comprehensive documentation and knowledge transfer programs that bridge your current state to your future architecture.

This isn't traditional "admin support." It's:
• **Systems Archeology**: Documenting every workflow, integration, and automation decision in your Salesforce org
• **Migration Blueprinting**: Translating current business logic into platform-agnostic specifications
• **AI-Accelerated Documentation**: Using our automation tools to map dependencies, document edge cases, and create handoff materials
• **Parallel Support**: Keeping operations running while simultaneously building your migration foundation

Since we've been inside your systems for the past year, we already know the architecture. The question is whether it makes sense to leverage that embedded knowledge for the transition—or start fresh with a team that needs to learn your org from scratch.

Worth a conversation? Not asking for a decision today—just exploring whether there's a partnership opportunity as you navigate this migration.

Best,
[Your Name]

P.S. I put together a quick Loom walking through what "Migration Intelligence" looks like operationally. Takes 90 seconds: [Loom Link]`
    },
    loomScript: `**LOOM VIDEO SCRIPT: Vercel Migration Intelligence Play**
**Time Limit:** 90 Seconds. **Tone:** Trusted Partner, Strategic Advisor.

**0:00 - 0:25 | Validating the Partnership Foundation (Camera ON, Face only)**
"Hi [Name]. For the past year, SOLVD has been your outsourced Salesforce admin team—160 hours a month through our EaaSe model, keeping your CRM, integrations, and rev ops running while you focused on building Vercel's platform.

And now you're at an inflection point: **migrating away from Salesforce and consolidating onto your own infrastructure.** That's the right strategic move for a company at your scale. But here's what I want to talk about: the operational gap between 'deciding to migrate' and 'successfully migrating without losing institutional knowledge.'"

**0:25 - 0:50 | The Migration Knowledge Wall (Share Screen: Slide 3 "The Migration Documentation Gap")**
"We call this **The Migration Documentation Gap**. [SHOW SLIDE] Your Salesforce org represents years of business logic—automated workflows, integration patterns, edge case handling, and revenue operations decisions that are buried in:
• Ticket histories that won't transfer
• Process Builder flows built by people who left
• Integration logic that 'just works' but nobody remembers why

When companies migrate without systematic documentation, they spend 6-12 months reverse-engineering their own systems. You end up rebuilding automations from scratch because the *why* behind the *what* was never captured. That's not a technical problem—it's an **organizational memory problem.**"

**0:50 - 1:15 | The SOLVD Migration Intelligence Model (Switch to Slide 6 "Migration Intelligence Services")**
"That's where **Migration Intelligence** comes in. [SHOW SLIDE] Because we've been embedded in your Salesforce operations for a year, we already know:
• Every integration touchpoint
• The business logic behind your automations  
• The dependencies between systems
• The edge cases that break things

We can systematically document your entire Salesforce architecture, translate it into platform-agnostic migration blueprints, and create comprehensive handoff documentation—all while continuing to support your day-to-day operations during the transition.

It's the same EaaSe capacity model you're already using, but redirected toward **migration readiness** instead of just ticket resolution. You get both: operational continuity *and* institutional knowledge preservation."

**1:15 - 1:30 | The Partnership Extension Ask (Camera ON, Face only)**
"I'm not asking you to commit to anything today. I'm asking: **Does it make sense to leverage the team that already knows your systems—or start fresh with a team that needs to learn everything from scratch?**

If there's a conversation worth having, reply to the email. Let's map out what a migration readiness engagement could look like alongside your renewal."`,
    slideContent: {
      title: "The Migration Documentation Gap",
      problem: [
        "Years of Salesforce business logic trapped in ticket histories and tribal knowledge",
        "Migration teams spend 6-12 months reverse-engineering systems without documentation"
      ],
      reality: [
        "Platform consolidation is the right move, but institutional memory doesn't transfer automatically",
        "Without systematic documentation, you'll rebuild automations from scratch during migration"
      ],
      shift: [
        "Migration Intelligence: Document architecture, translate logic, preserve institutional knowledge",
        "Leverage embedded teams who already know your systems instead of onboarding from zero"
      ]
    }
  };

  const handleGenerate = () => {
    setShowResults(true);
  };

  const renderForm = () => {
    if (activeTab === 'netnew') {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
            <p className="text-sm text-blue-800"><strong>Demo Mode:</strong> This will generate sample Vercel outputs regardless of inputs.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Company *</label>
            <input
              type="text"
              defaultValue="Vercel"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Acme Corp"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website URL *</label>
            <input
              type="url"
              defaultValue="https://vercel.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="https://acmecorp.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
            <input
              type="url"
              defaultValue="https://www.linkedin.com/company/vercel/"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="https://linkedin.com/company/acme"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
              <option>SaaS/High Tech</option>
              <option>Financial Services</option>
              <option>Consumer Goods</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Falsehood to Challenge *</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
              <option>Hiring Internal is Safer</option>
              <option>Budget Constraints</option>
              <option>DIY AI is Sufficient</option>
            </select>
          </div>
        </div>
      );
    } else if (activeTab === 'closedlost') {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
            <p className="text-sm text-blue-800"><strong>Demo Mode:</strong> This will generate sample Vercel outputs regardless of inputs.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Name *</label>
            <input
              type="text"
              defaultValue="Vercel Enterprise Support Upgrade"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Q3 Digital Transformation"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Original Champion Name *</label>
            <input
              type="text"
              placeholder="Sarah Johnson"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loss Reason *</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
              <option>Price</option>
              <option>No Decision / Non-Responsive</option>
              <option>Lost to Competitor</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loss Date *</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Context (Optional)</label>
            <input
              type="text"
              placeholder="Series F funding, v0 launch, AI Cloud pivot..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
            <p className="text-sm text-green-800"><strong>Demo Mode:</strong> Pre-loaded with Vercel expansion scenario.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
            <input
              type="text"
              value="Vercel"
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
            <select value="SaaS/High Tech" disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
              <option>SaaS/High Tech</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Previous Project *</label>
            <input
              type="text"
              value="Vercel - Outsourced Admin (160hrs/month EaaSe - Salesforce & Integrations)"
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Trigger *</label>
            <input
              type="text"
              value="Salesforce Migration Planning + Org Documentation Need + Platform Consolidation"
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Health Score (1-10) *</label>
            <input
              type="number"
              value="9"
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-t-4 border-blue-600">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="text-blue-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-900">ASOE</h1>
          </div>
          <p className="text-gray-600">Automated Sales Outreach Engine - AI-Powered Personalization</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Input */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Outreach Type</h2>
            
            {/* Workflow Tabs */}
            <div className="grid grid-cols-1 gap-3 mb-6">
              <button
                onClick={() => setActiveTab('netnew')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  activeTab === 'netnew'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">🎯 Net New Prospecting</div>
                <div className="text-sm text-gray-600 mt-1">Cold outreach challenging business assumptions</div>
              </button>
              
              <button
                onClick={() => setActiveTab('closedlost')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  activeTab === 'closedlost'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">🦢 Closed Lost Deals</div>
                <div className="text-sm text-gray-600 mt-1">Re-engage dead deals with new context</div>
              </button>
              
              <button
                onClick={() => setActiveTab('expansion')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  activeTab === 'expansion'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">💼 Past Clients (Expansion)</div>
                <div className="text-sm text-gray-600 mt-1">Upsell/cross-sell based on new triggers</div>
              </button>
            </div>

            {/* Form */}
            <div className="mb-6">
              {renderForm()}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
            >
              <ArrowRight size={20} />
              Generate Outreach Assets
            </button>
          </div>

          {/* Right Column - Output Preview */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            {!showResults ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="bg-gray-100 rounded-full p-6 mb-4">
                  <Send className="text-gray-400" size={48} />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to Generate</h3>
                <p className="text-gray-500 max-w-sm">
                  Click "Generate Outreach Assets" to see AI-powered email drafts, Loom scripts, and slide content
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <CheckCircle className="text-green-600" size={24} />
                  <h2 className="text-xl font-bold text-gray-800">Assets Generated: Vercel</h2>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <FileText className="mx-auto mb-1 text-blue-600" size={20} />
                    <div className="text-xs text-blue-800 font-medium">Email Draft</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <Video className="mx-auto mb-1 text-purple-600" size={20} />
                    <div className="text-xs text-purple-800 font-medium">Loom Script</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <Presentation className="mx-auto mb-1 text-green-600" size={20} />
                    <div className="text-xs text-green-800 font-medium">Slide Content</div>
                  </div>
                </div>

                {/* Scroll Area for Outputs */}
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {/* Email */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FileText size={16} className="text-blue-600" />
                      Email Draft
                    </h3>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <div className="mb-3">
                        <strong className="text-gray-700">Subject:</strong>
                        <div className="text-gray-900 mt-1">{vercelOutputs.email.subject}</div>
                      </div>
                      <div>
                        <strong className="text-gray-700">Body:</strong>
                        <pre className="text-gray-900 mt-1 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                          {vercelOutputs.email.body}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Loom Script */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Video size={16} className="text-purple-600" />
                      Loom Video Script (90 sec)
                    </h3>
                    <div className="bg-gray-50 p-3 rounded">
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap font-sans leading-relaxed">
                        {vercelOutputs.loomScript}
                      </pre>
                    </div>
                  </div>

                  {/* Slide Content */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Presentation size={16} className="text-green-600" />
                      Slide 3 Content
                    </h3>
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200">
                      <h4 className="text-lg font-bold text-indigo-900 mb-4">
                        {vercelOutputs.slideContent.title}
                      </h4>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-bold text-indigo-700 mb-1.5 uppercase tracking-wide">The Problem</p>
                          <ul className="list-disc list-inside space-y-1 text-gray-800">
                            {vercelOutputs.slideContent.problem.map((item, i) => (
                              <li key={i} className="text-sm leading-snug">{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-indigo-700 mb-1.5 uppercase tracking-wide">The Reality (2026)</p>
                          <ul className="list-disc list-inside space-y-1 text-gray-800">
                            {vercelOutputs.slideContent.reality.map((item, i) => (
                              <li key={i} className="text-sm leading-snug">{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-indigo-700 mb-1.5 uppercase tracking-wide">The Shift</p>
                          <ul className="list-disc list-inside space-y-1 text-gray-800">
                            {vercelOutputs.slideContent.shift.map((item, i) => (
                              <li key={i} className="text-sm leading-snug">{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-800 font-semibold mb-1.5">🚀 Next Steps:</p>
                  <ol className="list-decimal list-inside text-xs text-green-700 space-y-0.5">
                    <li>Customize email draft with specific champion name</li>
                    <li>Record Loom video following the timestamped script</li>
                    <li>Update master slide deck with "AI Operations Wall" content</li>
                    <li>Send coordinated outreach and track engagement</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Production Architecture Note */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
          <h3 className="font-bold text-gray-800 mb-2">Production System Architecture</h3>
          <p className="text-sm text-gray-600 mb-3">
            This demo shows the core workflow. In production, inputs come from <strong>Slack workflow forms</strong>, 
            enrichment adds <strong>Apollo.io data + web scraping</strong>, routing happens through <strong>n8n</strong>, 
            intelligence uses <strong>Gemini 2.5 Pro or Claude Opus 4.5</strong>, and outputs auto-create 
            <strong> Google Docs + Slides</strong> with <strong>Slack notifications</strong>.
          </p>
          <div className="flex gap-2 text-xs">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Slack Input</span>
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">n8n Orchestration</span>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">AI Intelligence</span>
            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">Google Drive Output</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ASOEDemo;