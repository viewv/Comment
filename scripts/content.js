console.log("YouTube Comments Scraper Loaded");

// 等待评论区加载
const waitForCommentsSection = async () => {
    return new Promise((resolve) => {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (document.querySelector("#comments")) {
                    console.log("Comments section detected!");
                    observer.disconnect(); // 停止观察
                    resolve();
                    break;
                }
            }
        });

        // 监听整个页面的变化
        observer.observe(document.body, { childList: true, subtree: true });
    });
};

// 滚动加载评论
const scrollToLoadComments = async () => {
    let lastScrollHeight = 0;
    while (true) {
        const scrollHeight = document.documentElement.scrollHeight;
        window.scrollTo(0, scrollHeight);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待加载
        if (scrollHeight === lastScrollHeight) break; // 如果滚动高度不变，结束加载
        lastScrollHeight = scrollHeight;
    }
    console.log("Finished scrolling.");
};

// 获取评论内容
const extractComments = () => {
    const comments = [];
    const commentElements = document.querySelectorAll("#content-text"); // 评论的 DOM 元素
    commentElements.forEach((element) => {
        comments.push(element.innerText.trim());
    });
    return comments;
};

// 主逻辑
(async () => {
    console.log("Waiting for comments section...");
    await waitForCommentsSection(); // 等待评论部分加载
    console.log("Scanning comments...");
    await scrollToLoadComments();
    const comments = extractComments();
    console.log("Extracted Comments:", comments);

    // 可选：将评论发送到后台或扩展页面
    chrome.runtime.sendMessage({ action: "comments_extracted", data: comments });
})();