

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