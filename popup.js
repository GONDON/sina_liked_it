// 添加连接状态检查
async function executeAction(action) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.error('没有找到活动标签页');
      return;
    }

    // 检查是否在正确的网页上
    if (!tab.url || !tab.url.includes('weibo.com')) {
      alert('请在微博页面使用此功能！');
      return;
    }

    // 先尝试直接发送消息
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action });
      console.log('操作执行结果:', response);
      return;
    } catch (err) {
      console.log('直接发送消息失败，尝试重新注入脚本...');
    }

    // 如果直接发送失败，尝试重新注入脚本
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // 等待脚本加载
      await new Promise(resolve => setTimeout(resolve, 500));

      // 重新尝试发送消息
      const response = await chrome.tabs.sendMessage(tab.id, { action });
      console.log('操作执行结果:', response);
    } catch (err) {
      console.error('注入脚本或发送消息失败:', err);
      alert('操作失败，请刷新页面后重试');
    }

  } catch (error) {
    console.error('执行操作时出错:', error);
    alert('发生错误，请刷新页面后重试');
  }
}

// 点击事件监听器
document.getElementById('startLiking').addEventListener('click', () => {
  executeAction('startLiking');
});

document.getElementById('stopLiking').addEventListener('click', () => {
  executeAction('stopLiking');
}); 