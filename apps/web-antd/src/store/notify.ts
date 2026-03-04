import type { NotificationItem } from '@vben/layouts';

import { computed, ref, watch } from 'vue';

import { SvgMessageUrl } from '@vben/icons';
import { $t } from '@vben/locales';
import { useUserStore } from '@vben/stores';

import { Modal, notification } from 'ant-design-vue';
import dayjs from 'dayjs';
import { defineStore } from 'pinia';

import { useSseMessage } from '#/utils/message';

export const useNotifyStore = defineStore(
  'app-notify',
  () => {
    /**
     * return才会被持久化 存储全部消息
     */
    const notificationList = ref<NotificationItem[]>([]);

    const userStore = useUserStore();
    const userId = computed(() => {
      return userStore.userInfo?.userId || '0';
    });

    const notifications = computed(() => {
      return notificationList.value.filter(
        (item) => item.userId === userId.value,
      );
    });

    /**
     * 开始监听sse消息
     */
    function startListeningMessage() {
      // 默认sse 使用 websocket自行开启注释
      // const websocketReturnData = useWebSocketMessage();
      // if (!websocketReturnData) {
      //   return;
      // }
      // const { data } = websocketReturnData;

      const sseReturnData = useSseMessage();
      if (!sseReturnData) {
        return;
      }
      const { data } = sseReturnData;

      watch(data, (message) => {
        if (!message) return;
        console.log(`接收到消息: ${message}`);

        // 尝试解析消息，判断是否为章节生成的进度消息
        try {
          const parsedMessage = JSON.parse(message);
          const msgType: string = parsedMessage.type || '';
          // 章节生成相关的所有进度消息（batch_* / chapter_* / start / progress）不显示通知
          // 让其他监听者（step2-generate.vue）处理这些消息
          if (
            msgType === 'start' || msgType === 'progress' ||
            msgType.startsWith('batch_') || msgType.startsWith('chapter_')
          ) {
            return;
          }
          // 如果是章节生成的成功消息，显示卡片通知
          if (msgType === 'success') {
            notification.success({
              description: parsedMessage.message || '操作成功',
              duration: 3,
              message: $t('component.notice.received'),
            });

            notificationList.value.unshift({
              avatar: SvgMessageUrl,
              date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              isRead: false,
              message: parsedMessage.message || '操作成功',
              title: $t('component.notice.title'),
              userId: userId.value,
            });

            return;
          }
          // 如果是章节生成的错误消息，显示错误通知
          if (msgType === 'error') {
            notification.error({
              description: parsedMessage.message || '操作失败',
              duration: 3,
              message: $t('component.notice.received'),
            });

            notificationList.value.unshift({
              avatar: SvgMessageUrl,
              date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              isRead: false,
              message: parsedMessage.message || '操作失败',
              title: $t('component.notice.title'),
              userId: userId.value,
            });

            return;
          }
        } catch (e) {
          // 如果不是JSON格式，说明是普通消息，继续显示通知
        }

        notification.success({
          description: message,
          duration: 3,
          message: $t('component.notice.received'),
        });

        notificationList.value.unshift({
          // avatar: `https://api.multiavatar.com/${random(0, 10_000)}.png`, 随机头像
          avatar: SvgMessageUrl,
          date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          isRead: false,
          message,
          title: $t('component.notice.title'),
          userId: userId.value,
        });

        // 需要手动置空 vue3在值相同时不会触发watch
        data.value = null;
      });
    }

    /**
     * 设置全部已读
     */
    function setAllRead() {
      notificationList.value
        .filter((item) => item.userId === userId.value)
        .forEach((item) => {
          item.isRead = true;
        });
    }

    /**
     * 设置单条消息已读
     * @param item 通知
     */
    function setRead(item: NotificationItem) {
      !item.isRead && (item.isRead = true);
      // 显示信息
      Modal.info({
        title: item.title,
        content: item.message,
      });
    }

    /**
     * 清空全部消息
     */
    function clearAllMessage() {
      notificationList.value = notificationList.value.filter(
        (item) => item.userId !== userId.value,
      );
    }

    /**
     * 只需要空实现即可
     * 否则会在退出登录清空所有
     */
    function $reset() {
      // notificationList.value = [];
    }
    /**
     * 显示小圆点
     */
    const showDot = computed(() =>
      notificationList.value
        .filter((item) => item.userId === userId.value)
        .some((item) => !item.isRead),
    );

    return {
      $reset,
      clearAllMessage,
      notificationList,
      notifications,
      setAllRead,
      setRead,
      showDot,
      startListeningMessage,
    };
  },
  {
    persist: {
      pick: ['notificationList'],
    },
  },
);
