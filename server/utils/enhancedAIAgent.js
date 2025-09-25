// utils/enhancedAIAgent.js
const { getAIAgent } = require('./aiAgent');
const DateTimeUtils = require('./dateTimeUtils');
const { isWorkingDay } = require('./holidayService');

class EnhancedAIAgent {
  constructor() {
    this.baseAgent = null;
  }

  async initialize() {
    this.baseAgent = await getAIAgent();
    return this.baseAgent;
  }

  async queryWithContext(question, organizationId, additionalContext = {}) {
    if (!this.baseAgent) {
      await this.initialize();
    }

    // Enhanced context with holiday information
    const today = new Date();
    const isHoliday = !(await isWorkingDay(today));
    const holidayContext = {
      isHolidayToday: isHoliday,
      todayDate: DateTimeUtils.formatIST(today, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      ...additionalContext
    };

    const enhancedQuestion = `${question} | Context: ${JSON.stringify(holidayContext)}`;
    
    const response = await this.baseAgent.query(enhancedQuestion, organizationId);
    
    // Post-process response for better formatting
    return this.enhanceResponse(response, holidayContext);
  }

  enhanceResponse(response, context) {
    if (context.isHolidayToday) {
      response.response = `🎉 Today is a holiday! ${response.response}\n\nAll teachers are automatically marked present for holiday attendance.`;
    }

    // Add actionable insights
    if (response.response.includes('absent') || response.response.includes('attendance')) {
      response.insights = this.generateInsights(response.response);
    }

    return response;
  }

  generateInsights(responseText) {
    const insights = [];
    
    if (responseText.toLowerCase().includes('absent')) {
      insights.push('Consider following up with absent employees');
      insights.push('Check if any absentees have applied for leave');
      insights.push('Review attendance patterns for the week');
    }
    
    if (responseText.toLowerCase().includes('late')) {
      insights.push('Monitor frequent late arrivals');
      insights.push('Consider flexible timing options if pattern continues');
    }
    
    return insights;
  }
}

module.exports = new EnhancedAIAgent();