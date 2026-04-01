/**
 * Salesforce Enrichment Agent
 * Provides mock Salesforce data for Closed Lost and Expansion workflows
 * Will be replaced with real Salesforce API integration in Phase 4
 */

/**
 * Helper function to calculate time difference in months
 */
function getMonthsSince(dateString) {
  const pastDate = new Date(dateString);
  const now = new Date();
  const months = (now.getFullYear() - pastDate.getFullYear()) * 12 + (now.getMonth() - pastDate.getMonth());
  return months;
}

/**
 * Helper function to format time since as human-readable text
 */
function formatTimeSince(months) {
  if (months < 1) return 'less than a month';
  if (months === 1) return '1 month';
  if (months < 12) return `${months} months`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) {
    return years === 1 ? '1 year' : `${years} years`;
  }
  return years === 1 ? `${years} year and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : `${years} years and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
}

/**
 * Mock data generator for Closed Lost opportunities
 */
function generateClosedLostData(companyName, formData) {
  // Calculate time since loss
  const lossDate = formData.lossDate || '2023-01-15';
  const monthsSinceLoss = getMonthsSince(lossDate);
  const timeSinceLossText = formatTimeSince(monthsSinceLoss);

  // Calculate engagement history dates relative to loss date
  const lossDateObj = new Date(lossDate);
  const proposalDate = new Date(lossDateObj);
  proposalDate.setDate(proposalDate.getDate() - 36); // ~36 days before close
  const discoveryDate = new Date(lossDateObj);
  discoveryDate.setDate(discoveryDate.getDate() - 56); // ~56 days before close

  const mockData = {
    dataSource: 'mock',
    opportunity: {
      id: `OPP-${Math.random().toString(36).substring(7).toUpperCase()}`,
      name: formData.opportunityName || `${companyName} - Salesforce Implementation`,
      stageName: 'Closed Lost',
      closeDate: lossDate,
      amount: Math.floor(Math.random() * 100000) + 50000,
      lossReason: formData.lossReason || 'Price',
      description: `Initial implementation project for ${companyName}. Lost due to ${formData.lossReason || 'pricing concerns'}.`
    },
    account: {
      name: companyName,
      industry: formData.industry || 'Technology',
      employees: Math.floor(Math.random() * 5000) + 100
    },
    contacts: [
      {
        name: formData.champion || 'John Smith',
        title: formData.championTitle || 'VP of Operations',
        email: formData.championEmail || `${(formData.champion || 'john.smith').toLowerCase().replace(' ', '.')}@${companyName.toLowerCase().replace(/\s/g, '')}.com`
      }
    ],
    engagementHistory: [
      {
        date: lossDate,
        type: 'Opportunity Closed',
        description: `Lost to competitor due to ${formData.lossReason || 'price'}`
      },
      {
        date: proposalDate.toISOString().split('T')[0],
        type: 'Proposal Sent',
        description: 'Submitted comprehensive implementation proposal'
      },
      {
        date: discoveryDate.toISOString().split('T')[0],
        type: 'Discovery Call',
        description: 'Initial needs assessment and scoping call'
      }
    ],
    // NEW: Add time context for AI agents
    timeSinceLoss: {
      months: monthsSinceLoss,
      text: timeSinceLossText
    },
    newContext: formData.newContext || 'Company announced major expansion plans',
    retrievedAt: new Date().toISOString()
  };

  return mockData;
}

/**
 * Mock data generator for Expansion opportunities
 */
function generateExpansionData(companyName, formData) {
  const mockData = {
    dataSource: 'mock',
    account: {
      name: companyName,
      industry: formData.industry || 'Technology',
      relationshipStart: '2022-01-01',
      healthScore: formData.healthScore || 'Green',
      monthlyRetainer: Math.floor(Math.random() * 20000) + 5000
    },
    currentProjects: [
      {
        id: `PROJ-${Math.random().toString(36).substring(7).toUpperCase()}`,
        name: formData.previousProject || `${companyName} - EaaSe Support`,
        type: formData.projectType || 'EaaSe/Ongoing Support',
        startDate: '2022-03-01',
        status: 'Active',
        hoursPerMonth: Math.floor(Math.random() * 80) + 40,
        description: `Ongoing support and strategic advisory for ${companyName}`
      }
    ],
    recentActivity: [
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'Support Ticket',
        description: 'Resolved automation workflow issue'
      },
      {
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'Strategic Call',
        description: 'Quarterly business review'
      },
      {
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'Enhancement Request',
        description: 'Custom report development'
      }
    ],
    expansionTrigger: formData.newTrigger || 'Salesforce migration project announced',
    satisfactionScore: Math.floor(Math.random() * 2) + 8, // 8-10
    retrievedAt: new Date().toISOString()
  };

  return mockData;
}

/**
 * Main enrichment function
 */
export async function enrichWithSalesforceData(companyName, workflowType, formData) {
  console.log(`🔍 Enriching with Salesforce data (MOCK) for: ${companyName}`);

  try {
    let salesforceData = null;

    if (workflowType === 'closedlost') {
      salesforceData = generateClosedLostData(companyName, formData);
      console.log(`✅ Generated mock Closed Lost data for ${companyName}`);
    } else if (workflowType === 'expansion') {
      salesforceData = generateExpansionData(companyName, formData);
      console.log(`✅ Generated mock Expansion data for ${companyName}`);
    } else {
      console.log(`ℹ️  No Salesforce enrichment needed for workflow type: ${workflowType}`);
    }

    return salesforceData;

  } catch (error) {
    console.error(`❌ Error enriching Salesforce data:`, error.message);
    return null;
  }
}

/**
 * Placeholder for real Salesforce integration (Phase 4)
 *
 * import jsforce from 'jsforce';
 *
 * const conn = new jsforce.Connection({
 *   loginUrl: process.env.SALESFORCE_LOGIN_URL
 * });
 *
 * await conn.login(
 *   process.env.SALESFORCE_USERNAME,
 *   process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN
 * );
 *
 * const opportunities = await conn.query(`
 *   SELECT Id, Name, StageName, CloseDate, Description, Account.Name, Loss_Reason__c
 *   FROM Opportunity
 *   WHERE Account.Name LIKE '%${companyName}%'
 *   AND IsClosed = true AND IsWon = false
 *   ORDER BY CloseDate DESC
 *   LIMIT 5
 * `);
 */
