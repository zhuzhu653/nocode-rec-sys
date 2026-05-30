import { useState, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { RotateCcw, ZoomIn, ZoomOut, Check, X } from 'lucide-react';

const AvatarCropper = ({ imageSrc, onCancel, onSave }) => {
  const [crop, setCrop] = useState({
    unit: 'px', // 使用像素单位
    width: 150,
    height: 150,
    x: 0,
    y: 0,
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef(null);

  // 图片加载完成后的处理
  const handleImageLoad = (e) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;

    // 设置合适的初始裁剪区域
    const size = Math.min(width, height) * 0.8;
    const x = (width - size) / 2;
    const y = (height - size) / 2;

    setCrop({
      unit: 'px',
      width: size,
      height: size,
      x,
      y,
    });

    setImageLoaded(true);
  };

  // 安全的裁剪设置函数
  const handleCropChange = (newCrop) => {
    // 确保所有值都是有效的数字
    const safeCrop = {
      ...newCrop,
      x: Number(newCrop.x) || 0,
      y: Number(newCrop.y) || 0,
      width: Number(newCrop.width) || 150,
      height: Number(newCrop.height) || 150,
    };
    setCrop(safeCrop);
  };

  // 安全的裁剪完成函数
  const handleCropComplete = (c) => {
    const safeCrop = {
      ...c,
      x: Number(c.x) || 0,
      y: Number(c.y) || 0,
      width: Number(c.width) || 150,
      height: Number(c.height) || 150,
    };
    setCompletedCrop(safeCrop);
  };

  // 获取裁剪后的图片
  const getCroppedImg = () => {
    if (!imageRef.current || !completedCrop) {
      console.error('裁剪参数不完整');
      return null;
    }

    const image = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 设置输出尺寸
    const outputSize = 200;
    canvas.width = outputSize;
    canvas.height = outputSize;

    try {
      // 计算实际裁剪区域
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      // 创建离屏canvas处理旋转
      const offscreenCanvas = document.createElement('canvas');
      const offscreenCtx = offscreenCanvas.getContext('2d');

      offscreenCanvas.width = cropWidth;
      offscreenCanvas.height = cropHeight;

      // 先裁剪
      offscreenCtx.drawImage(
        image,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );

      // 在主canvas上处理旋转和缩放
      ctx.save();
      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.drawImage(
        offscreenCanvas,
        -outputSize / 2, -outputSize / 2, outputSize, outputSize
      );
      ctx.restore();

      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.error('图片裁剪失败:', error);
      return null;
    }
  };

  const handleSave = () => {
    const croppedImage = getCroppedImg();
    if (croppedImage) {
      onSave(croppedImage);
    } else {
      alert('裁剪失败，请重新选择图片');
    }
  };

  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  };

  const resetCrop = () => {
    if (imageRef.current) {
      const { width, height } = imageRef.current;
      const size = Math.min(width, height) * 0.8;
      const x = (width - size) / 2;
      const y = (height - size) / 2;

      setCrop({
        unit: 'px',
        width: size,
        height: size,
        x,
        y,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">裁剪头像</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-[#d4a373] hover:bg-[#c99a67]"
              disabled={!imageLoaded}
            >
              <Check className="h-4 w-4 mr-1" />
              确认
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 图片裁剪区域 */}
          <div className="flex-1">
            <div className="border rounded-lg p-4 bg-gray-50 max-h-[400px] overflow-auto">
              {imageSrc && (
                <ReactCrop
                  crop={crop}
                  onChange={handleCropChange}
                  onComplete={handleCropComplete}
                  aspect={1}
                  minWidth={100}
                  keepSelection
                  ruleOfThirds
                >
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="裁剪预览"
                    style={{
                      transform: `rotate(${rotation}deg) scale(${scale})`,
                      maxWidth: '100%',
                      maxHeight: '300px'
                    }}
                    onLoad={handleImageLoad}
                  />
                </ReactCrop>
              )}
            </div>
          </div>

          {/* 控制面板 */}
          <div className="lg:w-48 space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">调整工具</h4>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={rotateImage}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={resetCrop}>
                  重置
                </Button>
                <Button variant="outline" size="sm" onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-600">缩放: {scale.toFixed(1)}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-600">旋转: {rotation}°</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="90"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>• 拖动调整裁剪区域</p>
              <p>• 支持旋转和缩放</p>
              <p>• 输出 200×200 像素</p>
              <p>• 自动压缩图片质量</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropper;
