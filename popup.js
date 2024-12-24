// 状态管理
let isProcessing = false;
let currentProgress = 0;

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
    maxLikes: parseInt(maxLikesInput.value),
    interval: parseInt(intervalInput.value) * 1000
  };
  chrome.storage.sync.set({ settings });
}

// 加载设置
async function loadSettings() {
  const result = await chrome.storage.sync.get('settings');
  if (result.settings) {
    maxLikesInput.value = result.settings.maxLikes;
    intervalInput.value = result.settings.interval / 1000;
  }
}

// 更新状态显示
function updateStatus(message, type = 'normal') {
  statusElement.textContent = message;
  statusElement.className = 'status ' + type;
}

// 更新进度条
function updateProgress(current, total) {
  const percentage = (current / total) * 100;
  progressValue.style.width = `${percentage}%`;
  progressText.textContent = `已完成: ${current}/${total}`;
  currentProgress = current;
}

// 显示/隐藏进度条
function toggleProgress(show) {
  progressContainer.classList.toggle('visible', show);
}

// 执行操作的函数
async function executeAction(action) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      updateStatus('没有找到活动标签页', 'error');
      return;
    }

    if (!tab.url || !tab.url.includes('weibo.com')) {
      updateStatus('请在微博页面使用此功能！', 'error');
      return;
    }

    // 保存当前设置
    saveSettings();

    const settings = {
      maxLikes: parseInt(maxLikesInput.value),
      interval: parseInt(intervalInput.value) * 1000
    };

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action,
        settings 
      });
      
      if (response.success) {
        isProcessing = true;
        updateStatus('正在处理...', 'active');
        toggleProgress(true);
        updateProgress(0, settings.maxLikes);
        
        // 根据操作类型禁用相应按钮
        if (action === 'startLiking') {
          startLikingBtn.disabled = true;
          startUnlikingBtn.disabled = true;
        } else if (action === 'startUnliking') {
          startUnlikingBtn.disabled = true;
          startLikingBtn.disabled = true;
        }
      }
      
    } catch (err) {
      console.log('直接发送消息失败，尝试重新注入脚本...');
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await chrome.tabs.sendMessage(tab.id, { 
        action,
        settings 
      });
      console.log('操作执行结果:', response);
    }

  } catch (error) {
    console.error('执行操作时出错:', error);
    updateStatus('操作失败，请刷新页面后重试', 'error');
  }
}

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'progress') {
    updateProgress(message.current, message.total);
  } else if (message.type === 'complete') {
    isProcessing = false;
    updateStatus('操作完成！');
    startLikingBtn.disabled = false;
    startUnlikingBtn.disabled = false;
  }
});

// 事件监听器
startLikingBtn.addEventListener('click', () => {
  executeAction('startLiking');
});

stopLikingBtn.addEventListener('click', () => {
  executeAction('stopLiking');
  isProcessing = false;
  updateStatus('已停止操作');
  toggleProgress(false);
  startLikingBtn.disabled = false;
  startUnlikingBtn.disabled = false;
});

startUnlikingBtn.addEventListener('click', () => {
  executeAction('startUnliking');
});

stopUnlikingBtn.addEventListener('click', () => {
  executeAction('stopUnliking');
  isProcessing = false;
  updateStatus('已停止取消点赞');
  toggleProgress(false);
  startLikingBtn.disabled = false;
  startUnlikingBtn.disabled = false;
});

// 输入框变化时保存设置
maxLikesInput.addEventListener('change', saveSettings);
intervalInput.addEventListener('change', saveSettings);

// 初始化
loadSettings(); 