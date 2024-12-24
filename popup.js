// 状态管理
let isProcessing = false;
let currentAction = ''; // 'like' 或 'unlike'
let activeTabId = null; // 添加当前标签页 ID

// DOM 元素
const startLikingBtn = document.getElementById('startLiking');
const stopLikingBtn = document.getElementById('stopLiking');
const startUnlikingBtn = document.getElementById('startUnliking');
const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settings');
const statusElement = document.getElementById('status');
const progressContainer = document.getElementById('progressContainer');
const progressValue = document.getElementById('progressValue');
const progressText = document.getElementById('progressText');
const maxLikesInput = document.getElementById('maxLikes');
const intervalInput = document.getElementById('interval');
const stopUnlikingBtn = document.getElementById('stopUnliking');

// 设置面板切换
settingsToggle.addEventListener('click', () => {
  settingsPanel.classList.toggle('visible');
});

// 保存设置
function saveSettings() {
  const settings = {
    maxLikes: parseInt(maxLikesInput.value) || 50,
    interval: (parseInt(intervalInput.value) || 2) * 1000
  };
  chrome.storage.sync.set({ settings });
  return settings;
}

// 加载设置
async function loadSettings() {
  const result = await chrome.storage.sync.get('settings');
  const settings = result.settings || { maxLikes: 50, interval: 2000 };
  
  // 更新输入框的值
  maxLikesInput.value = settings.maxLikes;
  intervalInput.value = settings.interval / 1000;
  
  return settings;
}

// 更新状态显示
function updateStatus(message, type = 'normal') {
  statusElement.textContent = message;
  statusElement.className = 'status ' + type;
}

// 更新进度显示
function updateProgress(current, total, action) {
  const progressValue = document.getElementById('progressValue');
  const progressText = document.getElementById('progressText');
  
  // 更新进度条
  const percentage = (current / total) * 100;
  progressValue.style.width = `${percentage}%`;
  
  // 更新文案和数字
  const actionText = action === 'like' ? '点赞' : '取消点赞';
  progressText.innerHTML = `${actionText}进度: <span id="progressCount">${current}</span>/<span id="progressTotal">${total}</span>`;
}

// 显示/隐藏进度条
async function toggleProgress(show) {
  const progressContainer = document.getElementById('progressContainer');
  if (show) {
    progressContainer.classList.add('visible');
  } else {
    progressContainer.classList.remove('visible');
    // 重置进度条
    const settings = await loadSettings();
    updateProgress(0, settings?.maxLikes || 50, currentAction);
  }
}

// 执行操作
async function executeAction(action) {
  try {
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      updateStatus('没有找到活动标签页', 'error');
      return;
    }

    if (!tab.url || !tab.url.includes('weibo.com')) {
      updateStatus('请在微博页面使用此功能！', 'error');
      return;
    }

    activeTabId = tab.id;
    
    // 保存并获取当前设置
    const settings = saveSettings();
    
    try {
      const response = await chrome.tabs.sendMessage(
        activeTabId,
        { action, settings }
      );

      if (response.success) {
        isProcessing = true;
        currentAction = action === 'startLiking' ? 'like' : 'unlike';
        updateStatus('正在处理...', 'active');
        toggleProgress(true);
        updateProgress(0, settings.maxLikes, currentAction);
        
        // 根据操作类型禁用相应按钮
        startLikingBtn.disabled = true;
        startUnlikingBtn.disabled = true;
        stopLikingBtn.disabled = false;
        stopUnlikingBtn.disabled = false;
      }
    } catch (err) {
      console.log('直接发送消息失败，尝试重新注入脚本...');
      
      await chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        files: ['content.js']
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await chrome.tabs.sendMessage(
        activeTabId,
        { action, settings }
      );
      
      if (response.success) {
        isProcessing = true;
        currentAction = action === 'startLiking' ? 'like' : 'unlike';
        updateStatus('正在处理...', 'active');
        toggleProgress(true);
        updateProgress(0, settings.maxLikes, currentAction);
        
        // 根据操作类型禁用相应按钮
        startLikingBtn.disabled = true;
        startUnlikingBtn.disabled = true;
        stopLikingBtn.disabled = false;
        stopUnlikingBtn.disabled = false;
      }
    }
  } catch (error) {
    console.error('执行操作失败:', error);
    updateStatus('操作失败，请重试', 'error');
  }
}

// 停止操作
function stopAction(action, isCompleted = false) {
  isProcessing = false;
  currentAction = '';
  
  // 根据操作类型和完成状态显示不同提示
  if (isCompleted) {
    const count = action.includes('like') ? 
      document.getElementById('progressCount').textContent : 0;
    const message = action.includes('unlike') ? 
      `成功取消点赞 ${count} 条微博` : 
      `成功点赞 ${count} 条微博`;
    updateStatus(message, 'active');
  } else {
    updateStatus('准备就绪');
  }
  
  toggleProgress(false);
  
  // 恢复所有按钮状态
  startLikingBtn.disabled = false;
  startUnlikingBtn.disabled = false;
  stopLikingBtn.disabled = true;
  stopUnlikingBtn.disabled = true;
}

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'progress') {
    updateProgress(message.current, message.total, currentAction);
  } else if (message.type === 'complete') {
    stopAction(message.action === 'like' ? 'stopLiking' : 'stopUnliking', true);
  }
});

// 事件监听器
startLikingBtn.addEventListener('click', () => {
  executeAction('startLiking');
});

stopLikingBtn.addEventListener('click', async () => {
  try {
    await chrome.tabs.sendMessage(activeTabId, { action: 'stopLiking' });
    stopAction('stopLiking');
  } catch (error) {
    console.error('停止点赞失败:', error);
    updateStatus('停止操作失败，请重试', 'error');
  }
});

startUnlikingBtn.addEventListener('click', () => {
  executeAction('startUnliking');
});

stopUnlikingBtn.addEventListener('click', async () => {
  try {
    await chrome.tabs.sendMessage(activeTabId, { action: 'stopUnliking' });
    stopAction('stopUnliking');
  } catch (error) {
    console.error('停止取消点赞失败:', error);
    updateStatus('停止操作失败，请重试', 'error');
  }
});

// 输入框变化时保存设置
maxLikesInput.addEventListener('change', saveSettings);
intervalInput.addEventListener('change', saveSettings);

// 初始化
loadSettings(); 