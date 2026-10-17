function runChecks(answer, link) {
    const text = typeof answer === 'string' ? answer.trim() : '';
  
    let linkValid = false;
    try {
      const url = new URL(typeof link === 'string' ? link.trim() : '');
      linkValid = url.protocol === 'http:' || url.protocol === 'https:';
    } catch (err) {
      linkValid = false;
    }
  
    const answerNotEmpty = text.length > 0;
    const answerLongEnough = text.length >= 50;
    const score = [answerNotEmpty, linkValid, answerLongEnough].filter(Boolean).length;
  
    return { answerNotEmpty, linkValid, answerLongEnough, score };
  }
  
  module.exports = { runChecks };