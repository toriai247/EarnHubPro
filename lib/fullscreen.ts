export const toggleFullscreen = async (element: HTMLElement = document.documentElement) => {
  if (!document.fullscreenElement) {
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
      return true;
    } catch (err) {
      console.error(`Error attempting to enable full-screen mode: ${err}`);
      return false;
    }
  } else {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
    return false;
  }
};

export const isFullscreenActive = () => {
  return !!document.fullscreenElement;
};