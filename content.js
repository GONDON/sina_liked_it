/*
 * @LastEditors: jizai ggmm9468@gmail.com
 * @Date: 2024-12-24 15:09:31
 * @LastEditTime: 2024-12-24 16:55:10
 * @FilePath: /sina_liked_it/content.js
 * @Description: 
 */
let isLiking = false;
let likeInterval;
let likeCount = 0;
const MAX_LIKES = 50;
const WAIT_INTERVAL = 2000; // 修改为10秒等待时间
let isUnliking = false;
let unlikeInterval;
let unlikeCount = 0;
const MAX_UNLIKES = 50;  // 最大取消点赞数量

// 检查按钮是否在视口中可见，如果不可见则尝试滚动到按钮位置
async function makeButtonVisible(button) {
  const rect = button.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  
  // 检查按钮是否在视口中
  const isVisible = (
    rect.top >= 0 &&
    rect.bottom <= windowHeight &&
    rect.left >= 0 &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );

  console.log('按钮位置信息:', {
    rectTop: rect.top,
    rectBottom: rect.bottom,
    windowHeight,
    isVisible
  });

  if (!isVisible) {
    // 计算需要滚动的距离，使按钮位于视口中间
    const scrollToY = window.pageYOffset + rect.top - (windowHeight / 2) + (rect.height / 2);
    console.log('滚动到按钮位置:', scrollToY);
    
    // 平滑滚动到按钮位置
    window.scrollTo({
      top: scrollToY,
      behavior: 'smooth'
    });

    // 等待滚动完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 再次检查按钮是否可见
    const newRect = button.getBoundingClientRect();
    return newRect.top >= 0 && newRect.bottom <= windowHeight;
  }

  return true;
}

// 点赞函数
async function likePost() {
  if (likeCount >= MAX_LIKES) {
    console.log(`已达到最大点赞数 ${MAX_LIKES}，停止点赞`);
    stopLiking();
    return;
  }

  // 查找所有点赞按钮的容器
  const buttonContainers = Array.from(document.querySelectorAll('.woo-box-flex.woo-box-alignCenter.woo-box-justifyCenter'));
  console.log('找到的按钮容器数量:', buttonContainers.length);
  
  // 过滤出未点赞的按钮
  const availableButtons = buttonContainers
    .filter(container => {
      const isLiked = Array.from(container.classList).some(className => className.startsWith('toolbar_cur_'));
      const isProcessed = container.classList.contains('processed');
      const hasLikeButton = container.querySelector('button[title="赞"]');
      
      console.log('容器状态:', {
        isLiked,
        isProcessed,
        hasLikeButton: !!hasLikeButton,
        classes: container.classList.toString()
      });
      
      return !isLiked && !isProcessed && hasLikeButton;
    })
    .map(container => container.querySelector('button[title="赞"]'));

  console.log('找到的可用点赞按钮数量:', availableButtons.length);
  
  // 只处理一个按钮
  for (const button of availableButtons) {
    const container = button.closest('.woo-box-flex');
    
    try {
      // 尝试使按钮可见
      const isVisible = await makeButtonVisible(button);
      
      if (isVisible) {
        console.log('找到可见的按钮，准备点赞');
        // 标记这个容器已经处理过
        container.classList.add('processed');
        
        // 其余的点赞逻辑保持不变...
        await new Promise((resolve, reject) => {
          const clickDelay = 1000 + Math.random() * 2000;
          console.log(`将在 ${clickDelay}ms 后点击按钮`);
          
          setTimeout(async () => {
            try {
              console.log('准备点击按钮:', button);
              button.click();
              console.log('点击点赞按钮完成');
              
              // 等待1.5秒检查点赞状态
              await new Promise(checkResolve => {
                setTimeout(() => {
                  const hasLikedAfterClick = Array.from(container.classList)
                    .some(className => className.startsWith('toolbar_cur_'));
                  
                  console.log('点赞状态检查:', {
                    hasLikedAfterClick,
                    containerClasses: container.classList.toString()
                  });
                  
                  if (hasLikedAfterClick) {
                    likeCount++;
                    console.log(`点赞成功，当前点赞数：${likeCount}/${MAX_LIKES}`);
                    checkResolve();
                  } else {
                    console.log('点赞未成功，可能是操作频繁，将在30秒后继续');
                  }
                }, 1500);
              });
              
              resolve();
            } catch (error) {
              console.error('点击按钮时出错:', error);
              reject(error);
            }
          }, clickDelay);
        });
        
        // 设置下一次点赞
        if (isLiking && likeCount < MAX_LIKES) {
          console.log('等待2秒后继续下一次点赞...');
          likeInterval = setTimeout(likePost, WAIT_INTERVAL);
        }
        
        break;
      } else {
        console.log('无法使按钮可见，尝试下一个按钮');
      }
    } catch (error) {
      console.error('处理按钮时出错:', error);
      continue;
    }
  }

  // 如果没有找到可见的按钮，滚动页面并重试
  if (availableButtons.length === 0) {
    console.log('没有找到可用按钮，准备滚动页面');
    window.scrollBy(0, 500);
    if (isLiking && likeCount < MAX_LIKES) {
      console.log('未找到可用的点赞按钮，滚动页面后5秒重试...');
      setTimeout(likePost, 5000);
    }
  }
}

// 停止点赞的函数
function stopLiking() {
  isLiking = false;
  if (likeInterval) {
    clearTimeout(likeInterval);
    likeInterval = null;
  }
  console.log('点赞操作已停止');
}

// 添加取消点赞函数
async function unlikePost() {
  if (unlikeCount >= MAX_UNLIKES) {
    console.log(`已达到最大取消点赞数 ${MAX_UNLIKES}，停止取消点赞`);
    stopUnliking();
    // 发送完成消息
    chrome.runtime.sendMessage({ 
      type: 'complete',
      action: 'unlike'
    });
    return;
  }

  // 查找所有已点赞的按钮容器
  const buttonContainers = Array.from(document.querySelectorAll('.woo-box-flex.woo-box-alignCenter.woo-box-justifyCenter'));
  console.log('找到的按钮容器数量:', buttonContainers.length);
  
  // 过滤出已点赞的按钮
  const availableButtons = buttonContainers
    .filter(container => {
      const isLiked = Array.from(container.classList).some(className => className.startsWith('toolbar_cur_'));
      const isProcessed = container.classList.contains('unlike-processed');
      const hasLikeButton = container.querySelector('button[title="赞"]');
      
      return isLiked && !isProcessed && hasLikeButton;
    })
    .map(container => container.querySelector('button[title="赞"]'));

  console.log('找到的可取消点赞按钮数量:', availableButtons.length);
  
  // 只处理一个按钮
  for (const button of availableButtons) {
    const container = button.closest('.woo-box-flex');
    
    try {
      // 尝试使按钮可见
      const isVisible = await makeButtonVisible(button);
      
      if (isVisible) {
        console.log('找到可见的按钮，准备取消点赞');
        // 标记这个容器已经处理过
        container.classList.add('unlike-processed');
        
        await new Promise((resolve, reject) => {
          const clickDelay = 1000 + Math.random() * 2000;
          console.log(`将在 ${clickDelay}ms 后点击按钮取消点赞`);
          
          setTimeout(async () => {
            try {
              console.log('准备点击按钮取消点赞:', button);
              button.click();
              console.log('点击取消点赞按钮完成');
              
              // 等待1.5秒检查取消点赞状态
              await new Promise(checkResolve => {
                setTimeout(() => {
                  const hasLikedAfterClick = Array.from(container.classList)
                    .some(className => className.startsWith('toolbar_cur_'));
                  
                  console.log('取消点赞状态检查:', {
                    hasLikedAfterClick,
                    containerClasses: container.classList.toString()
                  });
                  
                  if (!hasLikedAfterClick) {
                    unlikeCount++;
                    console.log(`取消点赞成功，当前取消数：${unlikeCount}/${MAX_UNLIKES}`);
                    // 发送进度更新
                    chrome.runtime.sendMessage({ 
                      type: 'progress',
                      current: unlikeCount,
                      total: MAX_UNLIKES
                    });
                    checkResolve();
                  } else {
                    console.log('取消点赞未成功，可能是操作频繁，将在2秒后继续');
                  }
                }, 1500);
              });
              
              resolve();
            } catch (error) {
              console.error('点击取消按钮时出错:', error);
              reject(error);
            }
          }, clickDelay);
        });
        
        // 设置下一次取消点赞
        if (isUnliking && unlikeCount < MAX_UNLIKES) {
          console.log('等待2秒后继续下一次取消点赞...');
          unlikeInterval = setTimeout(unlikePost, WAIT_INTERVAL);
        }
        
        break;
      }
    } catch (error) {
      console.error('处理取消点赞按钮时出错:', error);
      continue;
    }
  }

  // 如果没有找到可见的按钮，滚动页面并重试
  if (availableButtons.length === 0) {
    console.log('没有找到可取消点赞的按钮，准备滚动页面');
    window.scrollBy(0, 500);
    if (isUnliking && unlikeCount < MAX_UNLIKES) {
      console.log('未找到可用的取消点赞按钮，滚动页面后5秒重试...');
      setTimeout(unlikePost, 5000);
    }
  }
}

// 添加停止取消点赞的函数
function stopUnliking() {
  isUnliking = false;
  if (unlikeInterval) {
    clearTimeout(unlikeInterval);
    unlikeInterval = null;
  }
  console.log('取消点赞操作已停止');
  // 发送停止消息
  chrome.runtime.sendMessage({ 
    type: 'complete',
    action: 'unlike'
  });
}

// 修改初始化函数，添加取消点赞的消息处理
function initialize() {
  if (window.hasContentScript) return;
  window.hasContentScript = true;
  
  console.log('内容脚本初始化中...');
  
  try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('收到消息:', request.action);
      
      if (request.action === 'startLiking') {
        console.log('开始点赞操作');
        if (!isLiking) {
          isLiking = true;
          likeCount = 0;
          likePost();
        }
        sendResponse({ status: 'started', success: true });
      } else if (request.action === 'stopLiking') {
        console.log('停止点赞操作');
        stopLiking();
        sendResponse({ status: 'stopped', success: true });
      } else if (request.action === 'startUnliking') {
        console.log('开始取消点赞操作');
        if (!isUnliking) {
          isUnliking = true;
          unlikeCount = 0;
          unlikePost();
        }
        sendResponse({ status: 'started-unliking', success: true });
      } else if (request.action === 'stopUnliking') {
        console.log('停止取消点赞操作');
        stopUnliking();
        sendResponse({ status: 'stopped-unliking', success: true });
      }
      
      return true;
    });

    console.log('内容脚本初始化完成');
  } catch (error) {
    console.error('设置消息监听器时出错:', error);
  }
}

// 确保只初始化一次
if (!window.hasContentScript) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
} 