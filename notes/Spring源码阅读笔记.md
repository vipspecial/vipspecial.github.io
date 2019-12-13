# 手写Spring核心类

核心Spring IOC、DI、MVC

![image-20191207204206414](pic/image-20191207204206414.png)

如何找入口？

依赖注入 静态代理模式

Bean单利模式

## IOC

![image-20191208204818418](pic/image-20191208204818418.png)



### ApplicationContext

Bean接口

### BeanWrapper

Bean包装

### BeanDefinition

Bean定义

### BeanDefinitinReader

配置解析器



### MVC有9大组件

#### HandlerMapping

## 面试题

- Spring中的Bean是线程安全的吗？

   Bean在IOC容器，容器是从扫描到的，扫描到的是从配置文件，配置文件中Bean是自己写的

  Spring什么都没给干  只是new了一下，实际问的是IOC原理

- Spring是怎么new的？

- Spring中的Bean是如何被回收的

  看bean的作用域

  GC检测对象是否可达（是不是null，非null就可达）

  单例：跟Spring同生同死

  原型：用的时候new出来，完的置空回收

## 问题

### 第一天

1. 请用自己的语言描述SpringIOC、DI、MVC的基本执行原理。 

   1. init初始化读配置
   2. 找到扫描包路径
   3. 根据扫描包路径找到class类的映射存入IOC容器
   4. DI依赖注入，对注解属性赋值
   5. 初始化Mapping路径
   6. 启动后调用doGet、doPost从ioc中获取对应映射，静态代理调用方法执行，如有异常抛出

2. Spring中的Bean是线程安全的吗？为什么

   https://www.jianshu.com/p/2d7c65641b42

   https://blog.csdn.net/qq_29645505/article/details/88432001

   需要看Bean的作用域，Bean分几个作用域：

   1、单例：Spring提供的注解形式注入的Bean（即自己写的），所有线程共享一个Bean，会出现资源竞争，不过是线程安全的。Spring官方的Bean是通过ThreadLocal空间换时间解决线程安全问题

   2、原型：每次创建一个新对象，线程之间不存在Bean共享，不会有线程安全问题

### 第二天

1、请用自己的语言详细描述Spring IOC和DI的工作流程。

​	IOC:	DispatchServerlet的init方法调用ApplicationContext加载配置->BeanDefinitionReader扫描xml、注解等Bean注入到BeanDefinition->通过BeanWrapper包装下注入到IOC容器

DI：对有定义相关注解的属性通过IOC容器中拿到对应Bean进行复制

 2、BeanDefinition、BeanWrapper、ApplcationContext分别是什么作用？

BeanDefinition：xml文件的一些标签

BeanWrapper：为Bean提供一些操作方法来改变Bean的属性

ApplcationContext：只知道是入口，我也在查一查资料
