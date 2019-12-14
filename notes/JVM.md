# JVM

## 相关资料

[一张图看懂JVM](https://mp.weixin.qq.com/s?__biz=MzAxNjk4ODE4OQ==&mid=2247484432&idx=1&sn=381c98c49ffb813a9b9799e232a5a42c&chksm=9bed2562ac9aac74f6a3c5cc8f8c4a145e5bd9489eadd7ef12bc687239fa5ead497dac00ce6e&scene=0&key=c0940e0b2170699ab63621476b009383645cc10db9ce1ce7685af04b9b20dd771e838e4e1ffaa9ddb1c59193c5d686ba714c73cfd56311f55b001a680eacd79efd173308acf3eae64c7326dc30b06cd9&ascene=1&uin=MjgwMTEwNDQxNg%3D%3D&devicetype=Windows-QQBrowser&version=6103000b&lang=zh_CN&pass_ticket=7VimjYLmQAgyidy1vuYk8UcovgLF%2Fov0yGxcp%2B%2FloNe8nO%2B2veg9hLIgh4PfuU6V)

## 简单介绍

JVM是Java Virtual Machine（Java虚拟机）的缩写，是一种虚构出来的规范

1. 和java没有直接关系
2. 只运行class文件
3. 两种运行模式client和server模式
   1. client模式 运行GUI Java桌面程序

## JVM架构图

![JVM架构图](pic/JVM-Architecture-6297718.png)



## 基础知识

### 程序三种执行方式

#### 静态编译执行

​	编译成机器码，直接可以被CPU执行的命令

#### 动态编译执行

​	JIT编译是其中一种，运行时执行，可以将热点代码进行动态即时编译，编译之后的内容，放入方法区

​	动态编译通常指的是运行时将所有的代码都编译，JIT编译只是将部分代码进行编译（热点代码）

#### 动态解释执行

​	JMV有解析器，作用就是按照字节码指令进行逐行解析，逐行执行，每一次执行方法，都需要进行解析执行

### 即时、编译编译器

### JIT编辑器

程序中的代码只有热点代码时，才会编译为本地代码

#### 热点代码

运行过程中会被即时编译器编译的“热点代码”有两类：

1. 被多次调用的方法
2. 被多次执行的循环体

以方法为单位，Client模式1500次，Server模式10000次才会被定义为热点代码

#### 如果识别热点代码

1. 基于采样的热点探测
2. 基于计数器的热点探测

#### JIT编译器优化



## 常用命令



## 调优