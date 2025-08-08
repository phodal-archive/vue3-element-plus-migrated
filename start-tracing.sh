#!/bin/bash

echo "🚀 启动前端请求追踪系统..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查必要的依赖
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 Node.js"
    exit 1
fi

echo "📦 安装前端依赖..."
npm install

echo "🐳 启动追踪后端服务..."
docker-compose up -d

echo "⏳ 等待服务启动..."
sleep 10

echo "🌐 启动前端开发服务器..."
npm run dev &

echo ""
echo "✅ 系统启动完成！"
echo ""
echo "📍 访问地址："
echo "   - 前端应用: http://localhost:8080"
echo "   - 追踪调试器: http://localhost:8080/trace-debugger"
echo "   - Jaeger UI: http://localhost:16686"
echo "   - Zipkin UI: http://localhost:9411"
echo "   - 后端服务: http://localhost:3001"
echo ""
echo "🔍 使用说明："
echo "   1. 访问追踪调试器页面"
echo "   2. 点击测试按钮发送请求"
echo "   3. 查看实时追踪信息"
echo "   4. 在 Jaeger 中查看完整的追踪链路"
echo ""
echo "🛑 停止服务："
echo "   - 按 Ctrl+C 停止前端服务"
echo "   - docker-compose down 停止后端服务"
echo ""

# 等待用户中断
wait
