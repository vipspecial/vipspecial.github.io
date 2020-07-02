

# Mybatis

缓存

PerpetualCache基础类

装饰器模式（不改变原来对象基础上增加其他功能）

<cache/>标签默认使用PerpetualCache

### 一级缓存（local Cache）

作用域：同一个sqlSession，同一个会话相同语句

是放在Executor里面做的缓存PerpetualCache

更新了数据库，一级缓存会清空

##### 分布式情况多个session怎么处理的？

###  二级缓存

作用域：namespace

如果同时开启一级和二级缓存 ：拿缓存顺序 二级>一级

##### 开启方式

- 默认是开启的
- 控制全局二级缓存，默认true

<setting name="cacheEnabled" value="true"> 

- mappe.xml中加入<cache/>
- 排除某个方法不使用二级缓存加属性 userCache="false"

增删改清除缓存原因是属性flushCache默认是true，查询默认是false。如果在查询方法上加入flushCache="true"，查询也是每次都会清除缓存

二级缓存CachingExecutor

二级缓存是和事务绑定的，不执行commit是不会进入到Cache中

一、二级缓存失效条件：增删改后

## Spring Boot

# 第一个Starter

![image-20200628210944358](pic/image-20200628210944358.png)

自动装配

- importSlector
- SpringFactoriesLoader
- @Configuration
- @Comditional



# Actuator（监控）

- 引用spring-boot-actuator
- 有很多endpoint进行监控，例如beans、into、health、env

## Health状态

health还可以监控其他组件状态，如redis

<img src="pic/image-20200628212308607.png" alt="image-20200628212308607" style="zoom:25%;" />

## metrics

- JVM
- 系统信息（运行时间、平均负载、处理的信息
- 线程池信息
- tomcat会话信息
- Pheuthous/Grafana（图表展示）

## Loggers

- 可以修改日志级别



## info

- Application.properties中可进行设置
  - 可以使用maven中方式
  - info.app.name=@project.name@

## 自定义Endpoint



## Actuator监控形态

- http（web）

- jmx(java Management Extensions)

  - 远程监控/本地监控

  - 线程使用情况

  - 等等

  - 打开方式

    ![image-20200628215255918](pic/image-20200628215255918.png)



ApplicationContextAware Spring上下文

EnvironmentAware 环境信息

InitializingBean 初始化bean

DisposableBean 销毁bean



### SpringBoot信息可以发布到Prometheus+Grafana展示