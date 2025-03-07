/**
 * Get branches
 */
export interface GetBranchesParams {
  /**
   * Current page number
   */
  page?: number;
  /**
   * Name of branch to start the pagination from
   */
  page_token?: string;
  /**
   * Number of items per page
   */
  per_page?: number;
  /**
   * Return list of branches matching the regex
   */
  regex?: string;
  /**
   * Return list of branches matching the search criteria
   */
  search?: string;
  /**
   * Return list of branches sorted by the given field
   */
  sort?: Sort;
  [property: string]: any;
}

/**
* Return list of branches sorted by the given field
*/
export enum Sort {
  NameAsc = "name_asc",
  UpdatedAsc = "updated_asc",
  UpdatedDesc = "updated_desc",
}