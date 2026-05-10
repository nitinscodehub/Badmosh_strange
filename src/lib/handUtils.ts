export const isPalmOpen = (landmarks: any[]) => {
  if (!landmarks || landmarks.length < 21) return false;
  // Check if fingers are extended relative to their MCP joints
  const fingerTips = [8, 12, 16, 20];
  const mcpJoints = [5, 9, 13, 17];
  
  let extendedFingers = 0;
  for (let i = 0; i < fingerTips.length; i++) {
    if (landmarks[fingerTips[i]].y < landmarks[mcpJoints[i]].y) {
      extendedFingers++;
    }
  }
  
  return extendedFingers >= 3;
};
