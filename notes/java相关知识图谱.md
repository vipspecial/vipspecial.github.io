



# 简介

使用[Typora](http://typora.io)查看文档结构更清晰



# 中间件

## Nginx

### 代理服务器

#### 正向代理服务器

- 对客户端的代理
- 架设在客户端的主机
- 客户端在使用代理服务器时是知道所要真正访问服务器的地址
- 作用：隐藏、翻墙、提速、缓存、授权

- 场景：

  翻墙使用的就是使用正向代理实现

  公司内部nexsus本地仓库就是代理服务器

#### 反向代理服务器

- 对服务端的代理
- 客户端在使用代理服务器**好像**是知道其所要访问的服务真正地址，但实际不知道
- 架设在服务端的逐级
- 作用：分布式路由、集群负载均衡、动静分离、缓存

### Nginx特点

- 高并发
  - 默认情况下可达到1000的并发量
  - 硬件允许情况下5-10w并发
- 低消耗
  - 10000个非活跃连接，Nginxg中仅消耗2.5M的内存
- 热部署
  - 修改配置后可平滑重启
  - 可提供7*24小时不间断服务
- 高可用
  - Nginx中有一个主进程，有多个worker进程
- 高扩展
  - C语言扩展模块，与LUA脚本扩展模块 http://openresty.org/cn/

信息安全三要素：保密性、完整性与可用性

#### 安装

安装

```
安装C环境(c语言编写)：yum -y install gcc gcc-c++
安装依赖库：yum -y install pcre-devel openssl-devel
下载下载：wget http://nginx.org/download/nginx-1.16.1.tar.gz
创建文件路径：mkdir /opt/apps
解压到指定路径：tar -zxvf nginx-1.16.1.tar.gz -C /opt/apps/
查看查看可携带参数：./configure --help
生成makefile：./configure --prefix=/usr/local/nginx --with-http_ssl_module
编译编译后直接安装：make && make install
转到目录：cd /usr/local/nginx （核心配置文件conf/nginx.conf）
创建创建软链接：cd ~ 
   ln -s /usr/local/nginx/sbin/nginx /usr/local/sbin/

查看进程ps aux | grep nginx
```

相关命令

````
nginx
-t	检查配置文件是否有错误
-q  -tq一般组合使用，如果配置文件有错误会提示
-s （最常用）	stop 强制停止 quit 优雅停止，不会影响正在进行的任务 reopen 打开日志文件 reload 热部署平滑重启
-p  设置配置文件路径
-c  指定配置文件
-g	全局指令，一般不用
````

#### 零拷贝

##### 零拷贝基础

零拷贝指的是从一个存储区域到另一个存储区域的copy任务没有CPU内核(ALU)参与。通常用于网路文件传输，以减少CPU消耗和内存带宽占用，减少用户空间（用户可操作的内存缓存区域）与CPU内核空间（CPU可操作的内存缓存区域及寄存器缓存）的拷贝过程，减少用户上下文（用户状态环境）与CPU内核上下文（CPU状态环境） 间的切换，提高系统效率。

DMA直接内存访问

##### 传统拷贝方式



#### 多路复用

## 消息中间件

### 多种消息中间件对比

### RocketMQ

#### 主从

#### 组成部分

- 消息服务器（Broker）
- 生产者（Product）
- 消费者（Consumer）
- 主题（Topic）
- 组费者组（Group）
- 队列（Queue）
- 消息体（Message）

#### 重试机制

#### 重置消费位

------



### Kafka



------



### RibbitMQ

## 缓存

### Redis

​	单线程的内存操作

#### 类型

#### 常用命令

#### 数据底层存储结构

#### 模式

- 集群模式
- 主从模式

#### 实现分布式锁

#### Lua



### 本地缓存

## Zookeeper

### 选举策略

### 临时节点

### 实现分布式锁

## ELK

### LogStash

### ElacticSearch

### Kiabana
