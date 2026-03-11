import Company from '../models/company.model.js';
import Branch from '../models/branch.model.js';
import Department from '../models/department.model.js';
import Employee from '../models/employee.model.js';

// Get organization tree structure
export const getOrganizationTree = async (req, res) => {
  try {
    // Get all companies
    const companies = await Company.find({ isActive: true })
      .populate('parent', 'name code')
      .sort({ name: 1 });

    // Get all branches
    const branches = await Branch.find({ isActive: true })
      .populate('parent', 'name code')
      .populate('company', 'name code')
      .sort({ name: 1 });

    // Get all departments
    const departments = await Department.find({ isActive: true })
      .populate('parent', 'name code')
      .populate('company', 'name code')
      .populate('branch', 'name code')
      .populate('head', 'firstName lastName employeeId')
      .sort({ name: 1 });

    // Build company tree
    const buildCompanyTree = (parentId = null) => {
      return companies
        .filter(company => {
          if (parentId === null) {
            return !company.parent;
          }
          return company.parent && company.parent._id.toString() === parentId.toString();
        })
        .map(company => ({
          id: company._id,
          type: 'company',
          name: company.name,
          code: company.code,
          isActive: company.isActive,
          children: [
            ...buildCompanyTree(company._id),
            ...buildBranchTree(null, company._id),
            ...buildDepartmentTree(null, company._id, null)
          ]
        }));
    };

    // Build branch tree
    const buildBranchTree = (parentId = null, companyId = null) => {
      return branches
        .filter(branch => {
          const matchesParent = parentId === null 
            ? !branch.parent 
            : branch.parent && branch.parent._id.toString() === parentId.toString();
          const matchesCompany = companyId === null
            ? !branch.company
            : branch.company && branch.company._id.toString() === companyId.toString();
          return matchesParent && matchesCompany;
        })
        .map(branch => ({
          id: branch._id,
          type: 'branch',
          name: branch.name,
          code: branch.code,
          isActive: branch.isActive,
          children: [
            ...buildBranchTree(branch._id, companyId),
            ...buildDepartmentTree(null, companyId, branch._id)
          ]
        }));
    };

    // Build department tree
    const buildDepartmentTree = (parentId = null, companyId = null, branchId = null) => {
      return departments
        .filter(dept => {
          const matchesParent = parentId === null
            ? !dept.parent
            : dept.parent && dept.parent._id.toString() === parentId.toString();
          const matchesCompany = companyId === null
            ? !dept.company
            : dept.company && dept.company._id.toString() === companyId.toString();
          const matchesBranch = branchId === null
            ? !dept.branch
            : dept.branch && dept.branch._id.toString() === branchId.toString();
          return matchesParent && matchesCompany && matchesBranch;
        })
        .map(dept => {
          // Get employee count for this department
          return Employee.countDocuments({ department: dept._id, status: 'active' })
            .then(count => ({
              id: dept._id,
              type: 'department',
              name: dept.name,
              code: dept.code,
              isActive: dept.isActive,
              head: dept.head ? {
                id: dept.head._id,
                name: `${dept.head.firstName} ${dept.head.lastName}`,
                employeeId: dept.head.employeeId
              } : null,
              employeeCount: count,
              children: []
            }));
        });
    };

    // Helper to get employee count for department
    const getDepartmentWithCount = async (dept) => {
      const count = await Employee.countDocuments({ department: dept._id, status: 'active' });
      return {
        id: dept._id,
        type: 'department',
        name: dept.name,
        code: dept.code,
        isActive: dept.isActive,
        head: dept.head ? {
          id: dept.head._id,
          name: `${dept.head.firstName} ${dept.head.lastName}`,
          employeeId: dept.head.employeeId
        } : null,
        employeeCount: count,
        children: []
      };
    };

    // Build the tree structure
    const buildTree = async () => {
      const tree = [];

      // Start with root companies (no parent)
      const rootCompanies = companies.filter(c => !c.parent);
      
      for (const company of rootCompanies) {
        // Get branches under this company
        const companyBranches = branches.filter(b => 
          b.company && b.company._id.toString() === company._id.toString() && !b.parent
        );
        
        // Get departments directly under company (not under branch)
        const companyDepartments = departments.filter(d => 
          d.company && d.company._id.toString() === company._id.toString() && !d.parent && !d.branch
        );

        const branchChildren = [];
        for (const branch of companyBranches) {
          const branchDepts = departments.filter(d =>
            d.branch && d.branch._id.toString() === branch._id.toString() && !d.parent
          );
          const deptChildren = await Promise.all(branchDepts.map(getDepartmentWithCount));
          branchChildren.push({
            id: branch._id,
            type: 'branch',
            name: branch.name,
            code: branch.code,
            isActive: branch.isActive,
            children: deptChildren
          });
        }

        const deptChildren = await Promise.all(companyDepartments.map(getDepartmentWithCount));

        tree.push({
          id: company._id,
          type: 'company',
          name: company.name,
          code: company.code,
          isActive: company.isActive,
          children: [...branchChildren, ...deptChildren]
        });
      }

      // Root branches (not under any company)
      const rootBranches = branches.filter(b => !b.company && !b.parent);
      for (const branch of rootBranches) {
        const branchDepts = departments.filter(d =>
          d.branch && d.branch._id.toString() === branch._id.toString() && !d.parent
        );
        const deptChildren = await Promise.all(branchDepts.map(getDepartmentWithCount));
        tree.push({
          id: branch._id,
          type: 'branch',
          name: branch.name,
          code: branch.code,
          isActive: branch.isActive,
          children: deptChildren
        });
      }

      // Root departments (not under any company or branch)
      const rootDepartments = departments.filter(d => !d.company && !d.branch && !d.parent);
      const deptTree = await Promise.all(rootDepartments.map(getDepartmentWithCount));
      tree.push(...deptTree);

      return tree;
    };

    const organizationTree = await buildTree();

    res.json({
      success: true,
      data: organizationTree,
      summary: {
        companies: companies.length,
        branches: branches.length,
        departments: departments.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

