/*
 * @LastEditors: jizai ggmm9468@gmail.com
 * @Date: 2024-12-24 15:09:31
 * @LastEditTime: 2024-12-24 16:55:10
 * @FilePath: /sina_liked_it/content.js
 * @Description: 
 */
// 检查是否已经初始化过
if (typeof window.weiboPlusInitialized === 'undefined') {
  // 状态变量
  window.weiboPlusInitialized = true;
  window.isLiking = false;
  window.likeInterval = null;
  window.likeCount = 0;
  window.MAX_LIKES = 50;
  window.WAIT_INTERVAL = 2000;
  window.isUnliking = false;
  window.unlikeInterval = null;
  window.unlikeCount = 0;
  window.MAX_UNLIKES = 50;

  // 检查按钮是否在视口中可见
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

  // 发送进度更新
  function sendProgressUpdate(current, total, action) {
    chrome.runtime.sendMessage({ 
      type: 'progress',
      current: current,
      total: total,
      action: action
    });
  }

  // 发送完成通知
  function sendCompleteNotification(action) {
    chrome.runtime.sendMessage({ 
      type: 'complete',
      action: action
    });
  }

  // 点赞函数
  async function likePost() {
    if (window.likeCount >= window.MAX_LIKES) {
      console.log(`已达到最大点赞数 ${window.MAX_LIKES}，停止点赞`);
      stopLiking();
      sendCompleteNotification('like');
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
          
          await new Promise((resolve, reject) => {
            const clickDelay = 1000 + Math.random() * 2000;
            console.log(`将在 ${clickDelay}ms 后点击按钮`);
            
            setTimeout(async () => {
              try {
                console.log('准备点击按钮:', button);
                button.click();
                console.log('点击点赞按钮完成');
                
                // 等待1.5秒检查点赞状态
                setTimeout(() => {
                  const hasLikedAfterClick = Array.from(container.classList)
                    .some(className => className.startsWith('toolbar_cur_'));
                  
                  console.log('点赞状态检查:', {
                    hasLikedAfterClick,
                    containerClasses: container.classList.toString()
                  });
                  
                  if (hasLikedAfterClick) {
                    window.likeCount++;
                    console.log(`点赞成功，当前点赞数：${window.likeCount}/${window.MAX_LIKES}`);
                    sendProgressUpdate(window.likeCount, window.MAX_LIKES, 'like');
                  } else {
                    console.log('点赞未成功，可能是操作频繁，将在30秒后继续');
                  }
                  resolve(); // 无论成功与否都要 resolve
                }, 1500);
                
              } catch (error) {
                console.error('点击按钮时出错:', error);
                reject(error);
              }
            }, clickDelay);
          });
          
          // 设置下一次点赞
          if (window.isLiking && window.likeCount < window.MAX_LIKES) {
            console.log('等待2秒后继续下一次点赞...');
            window.likeInterval = setTimeout(likePost, window.WAIT_INTERVAL);
          }
          
          break;
        }
      } catch (error) {
        console.error('处理按钮时出错:', error);
        continue;
      }
    }

    // 如果没有找到可见的按钮，滚动页面并重试
    if (availableButtons.length === 0 && window.isLiking && window.likeCount < window.MAX_LIKES) {
      console.log('没有找到可用按钮，准备滚动页面');
      window.scrollBy(0, 500);
      console.log('未找到可用的点赞按钮，滚动页面后5秒重试...');
      setTimeout(likePost, 5000);
    }
  }

  // 停止点赞
  function stopLiking() {
    window.isLiking = false;
    if (window.likeInterval) {
      clearTimeout(window.likeInterval);
      window.likeInterval = null;
    }
    console.log('点赞操作已停止');
  }

  // 取消点赞函数
  async function unlikePost() {
    if (window.unlikeCount >= window.MAX_UNLIKES) {
      console.log(`已达到最大取消点赞数 ${window.MAX_UNLIKES}，停止取消点赞`);
      stopUnliking();
      sendCompleteNotification('unlike');
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
                setTimeout(() => {
                  const hasLikedAfterClick = Array.from(container.classList)
                    .some(className => className.startsWith('toolbar_cur_'));
                  
                  console.log('取消点赞状态检查:', {
                    hasLikedAfterClick,
                    containerClasses: container.classList.toString()
                  });
                  
                  if (!hasLikedAfterClick) {
                    window.unlikeCount++;
                    console.log(`取消点赞成功，当前取消数：${window.unlikeCount}/${window.MAX_UNLIKES}`);
                    sendProgressUpdate(window.unlikeCount, window.MAX_UNLIKES, 'unlike');
                  } else {
                    console.log('取消点赞未成功，可能是操作频繁，将在2秒后继续');
                  }
                  resolve(); // 无论成功与否都要 resolve
                }, 1500);
                
              } catch (error) {
                console.error('点击取消按钮时出错:', error);
                reject(error);
              }
            }, clickDelay);
          });
          
          // 设置下一次取消点赞
          if (window.isUnliking && window.unlikeCount < window.MAX_UNLIKES) {
            console.log('等待2秒后继续下一次取消点赞...');
            window.unlikeInterval = setTimeout(unlikePost, window.WAIT_INTERVAL);
          }
          
          break;
        }
      } catch (error) {
        console.error('处理取消点赞按钮时出错:', error);
        continue;
      }
    }

    // 如果没有找到可见的按钮，滚动页面并重试
    if (availableButtons.length === 0 && window.isUnliking && window.unlikeCount < window.MAX_UNLIKES) {
      console.log('没有找到可取消点赞的按钮，准备滚动页面');
      window.scrollBy(0, 500);
      console.log('未找到可用的取消点赞按钮，滚动页面后5秒重试...');
      setTimeout(unlikePost, 5000);
    }
  }

  // 停止取消点赞
  function stopUnliking() {
    window.isUnliking = false;
    if (window.unlikeInterval) {
      clearTimeout(window.unlikeInterval);
      window.unlikeInterval = null;
    }
    console.log('取消点赞操作已停止');
  }

  // 初始化消息监听
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('收到消息:', request.action);
    
    if (request.action === 'startLiking') {
      console.log('开始点赞操作');
      if (!window.isLiking) {
        window.isLiking = true;
        window.likeCount = 0;
        window.MAX_LIKES = request.settings?.maxLikes || 50;
        window.WAIT_INTERVAL = request.settings?.interval || 2000;
        likePost();
      }
      sendResponse({ status: 'started', success: true });
    } else if (request.action === 'stopLiking') {
      console.log('停止点赞操作');
      stopLiking();
      sendResponse({ status: 'stopped', success: true });
    } else if (request.action === 'startUnliking') {
      console.log('开始取消点赞操作');
      if (!window.isUnliking) {
        window.isUnliking = true;
        window.unlikeCount = 0;
        window.MAX_UNLIKES = request.settings?.maxLikes || 50;
        window.WAIT_INTERVAL = request.settings?.interval || 2000;
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

  console.log('微博点赞助手已初始化');
} 